import { prisma } from '../utils/prisma.js';
import { getRedis } from '../utils/redis.js';
import { ACTION_CONFIGS, DAILY_POINTS_GOAL, POINTS_EXPIRY_MONTHS } from '@eru/shared';
import { getMultiplier, getTierForPoints } from '@eru/shared';
import type { ActionType, EarnResult } from '@eru/shared';
import { Errors } from '../utils/errors.js';
import { badgesService } from './badgesService.js';

export async function earnPoints(
  userId: string,
  actionType: ActionType,
  contentId?: string,
  metadata?: { watchTimeSeconds?: number; wordCount?: number },
): Promise<EarnResult> {
  // 1. Validate action type exists
  const config = ACTION_CONFIGS[actionType];
  if (!config) {
    throw Errors.badRequest(`Unknown action type: ${actionType}`);
  }

  // 2. Validate contentId requirement
  if (config.requiresContentId && !contentId) {
    throw Errors.badRequest(`Action ${actionType} requires a contentId`);
  }

  // 3. Validate content exists if contentId provided
  if (contentId) {
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');
  }

  // 4. Check daily cap — count today's ledger entries for this user + actionType
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayCount = await prisma.pointsLedger.count({
    where: { userId, actionType, createdAt: { gte: today, lt: tomorrow } },
  });

  if (todayCount >= config.dailyCap) {
    throw Errors.dailyCapReached(actionType);
  }

  // 5. Validate action-specific rules (watch time, word count)
  if (config.validation.minWatchTimeSeconds) {
    if (!metadata?.watchTimeSeconds || metadata.watchTimeSeconds < config.validation.minWatchTimeSeconds) {
      throw Errors.badRequest(
        `Minimum watch time of ${config.validation.minWatchTimeSeconds}s not met for ${actionType}`,
      );
    }
  }
  if (config.validation.minWordCount) {
    if (!metadata?.wordCount || metadata.wordCount < config.validation.minWordCount) {
      throw Errors.badRequest(
        `Minimum word count of ${config.validation.minWordCount} not met for ${actionType}`,
      );
    }
  }

  // 6. Check for duplicate interactions (like, save, share are one-per-content)
  if (['like', 'save', 'share'].includes(actionType) && contentId) {
    const existing = await prisma.interaction.findUnique({
      where: {
        userId_contentId_type: {
          userId,
          contentId,
          type: actionType as 'like' | 'save' | 'share',
        },
      },
    });
    if (existing) {
      throw Errors.conflict(`Already performed ${actionType} on this content`);
    }
  }

  // 7. Get user's tier and calculate multiplier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, lifetimePoints: true, currentBalance: true, streakDays: true },
  });
  if (!user) throw Errors.notFound('User');

  const multiplier = getMultiplier(user.tier);
  const points = Math.round(config.points * multiplier);

  // 8. Calculate expiry date (6 months from now)
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + POINTS_EXPIRY_MONTHS);

  // 9. Transaction: create ledger entry + update user totals and tier
  const newLifetime = user.lifetimePoints + points;
  const newBalance = user.currentBalance + points;
  const newTier = getTierForPoints(newLifetime);

  await prisma.$transaction([
    prisma.pointsLedger.create({
      data: {
        userId,
        actionType,
        contentId: contentId ?? null,
        points,
        multiplierApplied: multiplier,
        expiresAt,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        lifetimePoints: newLifetime,
        currentBalance: newBalance,
        tier: newTier,
      },
    }),
  ]);

  // 10. Update Redis cache (fire-and-forget, never block the response)
  try {
    const redis = getRedis();
    redis.set(`balance:${userId}`, newBalance, { ex: 300 }).catch(() => {});

    // Update pincode leaderboard sorted set
    const userWithPincode = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryPincode: true },
    });
    if (userWithPincode?.primaryPincode) {
      redis
        .zincrby(`leaderboard:pincode:${userWithPincode.primaryPincode}`, points, userId)
        .catch(() => {});
    }
  } catch {
    // Redis is best-effort; never fail the earn flow
  }

  // 11. Update streak tracking
  await updateStreak(userId, points);

  // 12. Fire-and-forget badge unlock check (after streak update, before returning)
  badgesService.checkAndUnlock(userId).catch(() => {});

  // 13. Calculate daily progress for the response
  const dailyEarned = await prisma.pointsLedger.aggregate({
    where: { userId, createdAt: { gte: today, lt: tomorrow } },
    _sum: { points: true },
  });

  return {
    success: true,
    points,
    multiplier,
    newBalance,
    dailyProgress: {
      earned: dailyEarned._sum.points ?? 0,
      goal: DAILY_POINTS_GOAL,
    },
    streak: user.streakDays,
  };
}

/**
 * Upserts today's Streak record and updates the user's streakDays / streakLastDate.
 *
 * Logic:
 *  - If the user already earned points today, just increment the existing streak row.
 *  - If they last earned yesterday, extend the streak by 1.
 *  - Otherwise, reset the streak to 1 (new streak).
 */
async function updateStreak(userId: string, pointsEarned: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upsert today's streak row (idempotent for multiple actions in one day)
  await prisma.streak.upsert({
    where: { userId_date: { userId, date: today } },
    update: {
      pointsEarned: { increment: pointsEarned },
      actionsCount: { increment: 1 },
    },
    create: {
      userId,
      date: today,
      pointsEarned,
      actionsCount: 1,
    },
  });

  // Determine whether to extend or reset the streak counter on the user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { streakDays: true, streakLastDate: true },
  });
  if (!user) return;

  const todayStr = today.toISOString().split('T')[0];
  const lastDateStr = user.streakLastDate?.toISOString().split('T')[0];

  // Already counted today — nothing to update
  if (lastDateStr === todayStr) return;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Consecutive day => extend streak; gap => reset to 1
  const newStreak = lastDateStr === yesterdayStr ? user.streakDays + 1 : 1;

  await prisma.user.update({
    where: { id: userId },
    data: { streakDays: newStreak, streakLastDate: today },
  });
}
