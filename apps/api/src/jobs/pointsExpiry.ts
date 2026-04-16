import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

/**
 * pointsExpiry — runs daily at 2 AM IST (20:30 UTC).
 *
 * Two responsibilities:
 *  1. Mark ledger entries whose expiresAt <= now as expired=true,
 *     then recalculate each affected user's currentBalance.
 *  2. Send 30-day warning notifications to users who have points
 *     expiring in the next 30 days (and haven't been warned already).
 */
export async function runPointsExpiry(): Promise<void> {
  const now = new Date();

  // ── Step 1: expire overdue ledger entries ───────────────────────────────
  const expired = await prisma.pointsLedger.findMany({
    where: {
      expired: false,
      expiresAt: { lte: now },
    },
    select: { id: true, userId: true, points: true },
  });

  if (expired.length > 0) {
    console.log(`[pointsExpiry] Expiring ${expired.length} ledger entry(ies).`);

    // Mark them expired
    await prisma.pointsLedger.updateMany({
      where: { id: { in: expired.map((e) => e.id) } },
      data: { expired: true },
    });

    // Collect unique affected users
    const affectedUserIds = [...new Set(expired.map((e) => e.userId))];

    // Recalculate each user's currentBalance from non-expired, non-redeemed entries
    for (const userId of affectedUserIds) {
      const agg = await prisma.pointsLedger.aggregate({
        where: {
          userId,
          expired: false,
          redeemedAt: null,
        },
        _sum: { points: true },
      });
      const newBalance = agg._sum.points ?? 0;

      await prisma.user.update({
        where: { id: userId },
        data: { currentBalance: newBalance },
      });
    }

    console.log(`[pointsExpiry] Balances recalculated for ${affectedUserIds.length} user(s).`);
  } else {
    console.log('[pointsExpiry] No entries to expire today.');
  }

  // ── Step 2: 30-day expiry warnings ──────────────────────────────────────
  const warningWindowStart = now;
  const warningWindowEnd = new Date(now);
  warningWindowEnd.setUTCDate(warningWindowEnd.getUTCDate() + 30);

  // Find entries expiring in the next 30 days that are not yet expired
  const expiringSoon = await prisma.pointsLedger.findMany({
    where: {
      expired: false,
      redeemedAt: null,
      expiresAt: {
        gte: warningWindowStart,
        lte: warningWindowEnd,
      },
    },
    select: { userId: true, points: true, expiresAt: true },
    orderBy: { expiresAt: 'asc' },
  });

  // Aggregate by user so we send one notification per user
  const userExpiryMap = new Map<string, { totalPoints: number; earliestExpiry: Date }>();
  for (const entry of expiringSoon) {
    const existing = userExpiryMap.get(entry.userId);
    if (!existing) {
      userExpiryMap.set(entry.userId, {
        totalPoints: entry.points,
        earliestExpiry: entry.expiresAt,
      });
    } else {
      existing.totalPoints += entry.points;
      if (entry.expiresAt < existing.earliestExpiry) {
        existing.earliestExpiry = entry.expiresAt;
      }
    }
  }

  if (userExpiryMap.size > 0) {
    console.log(`[pointsExpiry] Sending 30-day expiry warnings to ${userExpiryMap.size} user(s).`);

    for (const [userId, { totalPoints, earliestExpiry }] of userExpiryMap) {
      const daysLeft = Math.ceil(
        (earliestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      await sendNotification({
        userId,
        type: 'points_expiry_warning',
        title: 'Your points are expiring soon ⏰',
        body: `${totalPoints} points expire in ${daysLeft} day(s). Redeem them before they're gone!`,
        priority: 'medium',
        deepLink: 'eru://wallet',
        data: { totalPoints: String(totalPoints), daysLeft: String(daysLeft) },
      });
    }
  }

  console.log('[pointsExpiry] Done.');
}
