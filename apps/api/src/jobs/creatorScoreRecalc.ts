import { prisma } from '../utils/prisma.js';
import { creatorScoreService } from '../services/creatorScoreService.js';

/**
 * creatorScoreRecalc — recalculates creator scores for all users who have
 * at least one published post in the last 30 days, ensuring active creators
 * always have an up-to-date reputation score.
 *
 * Runs nightly (hooked into the daily cron schedule in index.ts).
 */
export async function runCreatorScoreRecalc(): Promise<void> {
  // Find distinct user IDs that have published content in the last 30 days.
  // Limiting to recently-active users keeps the job fast and avoids
  // re-scoring dormant accounts unnecessarily.
  const recentlyActive = await prisma.content.findMany({
    where: {
      moderationStatus: 'published',
      publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  if (recentlyActive.length === 0) {
    console.log('[creatorScoreRecalc] No recently-active creators — nothing to recalculate.');
    return;
  }

  console.log(`[creatorScoreRecalc] Recalculating scores for ${recentlyActive.length} creator(s).`);

  for (const { userId } of recentlyActive) {
    try {
      await creatorScoreService.recalculate(userId);
    } catch (err) {
      console.error(`[creatorScoreRecalc] Failed for userId=${userId}:`, err);
    }
  }

  console.log('[creatorScoreRecalc] Done.');
}
