import { getRedis } from '../utils/redis.js';
import { prisma } from '../utils/prisma.js';
import { sendNotification } from '../services/notificationService.js';

/**
 * leaderboardReset — runs every Monday at midnight IST (Sunday 18:31 UTC).
 *
 * Responsibilities:
 *  1. Scan all Redis leaderboard keys (leaderboard:<scope>:<pincode>).
 *  2. Snapshot the top-10 per pincode into PostgreSQL (leaderboard_entries).
 *  3. Notify the #1 ranked user per pincode.
 *  4. Delete the Redis keys so the new week starts fresh.
 */
export async function runLeaderboardReset(): Promise<void> {
  const redis = getRedis();

  // Find all leaderboard keys in Redis
  // @upstash/redis scan returns [nextCursor, keys]
  let cursor = 0;
  const allKeys: string[] = [];

  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: 'leaderboard:*',
      count: 100,
    });
    cursor = Number(nextCursor);
    allKeys.push(...(keys as string[]));
  } while (cursor !== 0);

  if (allKeys.length === 0) {
    console.log('[leaderboardReset] No leaderboard keys found — nothing to reset.');
    return;
  }

  console.log(`[leaderboardReset] Processing ${allKeys.length} leaderboard key(s).`);

  // Determine the period for the snapshot (previous week)
  const periodEnd = new Date();
  periodEnd.setUTCHours(0, 0, 0, 0); // midnight today = end of last week

  const periodStart = new Date(periodEnd);
  periodStart.setUTCDate(periodStart.getUTCDate() - 7); // 7 days ago

  for (const key of allKeys) {
    // key format: leaderboard:<scope>:<pincode>
    const parts = key.split(':');
    if (parts.length !== 3) continue;
    const [, scope, pincode] = parts;

    // Fetch top 10 with scores: returns alternating [userId, score, ...]
    const rankings = await redis.zrange(key, 0, 9, { rev: true, withScores: true });
    if (!rankings || rankings.length === 0) {
      await redis.del(key);
      continue;
    }

    const entries: { userId: string; score: number }[] = [];
    for (let i = 0; i < rankings.length; i += 2) {
      entries.push({
        userId: rankings[i] as string,
        score: Number(rankings[i + 1]),
      });
    }

    // Snapshot to PostgreSQL
    for (let i = 0; i < entries.length; i++) {
      const { userId, score } = entries[i];
      await prisma.leaderboardEntry.create({
        data: {
          userId,
          pincode,
          scope,
          periodStart,
          periodEnd,
          pointsEarned: score,
          rank: i + 1,
        },
      });
    }

    // Notify #1 if we have a winner
    if (entries.length > 0) {
      const winner = entries[0];
      await sendNotification({
        userId: winner.userId,
        type: 'leaderboard_winner',
        title: "You're #1 on the leaderboard! 🏆",
        body: `Congratulations! You topped the ${pincode} leaderboard this week with ${winner.score} points.`,
        priority: 'high',
        deepLink: 'eru://leaderboard',
        data: { pincode, scope, points: String(winner.score) },
      });
    }

    // Delete the Redis key so the new week starts fresh
    await redis.del(key);
  }

  console.log('[leaderboardReset] All leaderboards snapshotted and reset.');
}
