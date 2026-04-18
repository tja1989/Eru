import { prisma } from '../utils/prisma.js';

type UnlockRule =
  | { type: 'streak_days'; threshold: number }
  | { type: 'rewards_claimed'; threshold: number }
  | { type: 'posts_published'; threshold: number }
  | { type: 'reviews_written'; threshold: number };

async function meetsRule(userId: string, rule: UnlockRule): Promise<boolean> {
  if (rule.type === 'streak_days') {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { streakDays: true } });
    return (u?.streakDays ?? 0) >= rule.threshold;
  }
  if (rule.type === 'rewards_claimed') {
    const count = await prisma.userReward.count({ where: { userId } });
    return count >= rule.threshold;
  }
  if (rule.type === 'posts_published') {
    const count = await prisma.content.count({
      where: { userId, moderationStatus: 'published' },
    });
    return count >= rule.threshold;
  }
  if (rule.type === 'reviews_written') {
    const count = await prisma.pointsLedger.count({
      where: { userId, actionType: 'review' as any },
    });
    return count >= rule.threshold;
  }
  return false;
}

export const badgesService = {
  async checkAndUnlock(userId: string) {
    const all = await prisma.badge.findMany();
    const owned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const ownedIds = new Set(owned.map((b) => b.badgeId));

    for (const badge of all) {
      if (ownedIds.has(badge.id)) continue;
      const rule = badge.unlockRule as UnlockRule;
      if (await meetsRule(userId, rule)) {
        await prisma.userBadge.create({
          data: { userId, badgeId: badge.id },
        });
      }
    }
  },

  async listWithStatus(userId: string) {
    const badges = await prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } });
    const owned = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, unlockedAt: true },
    });
    const map = new Map(owned.map((b) => [b.badgeId, b.unlockedAt]));

    return badges.map((b) => ({
      id: b.id,
      code: b.code,
      title: b.title,
      description: b.description,
      emoji: b.emoji,
      unlockedAt: map.get(b.id) ?? null,
    }));
  },
};
