import { prisma } from '../utils/prisma.js';
import { Prisma } from '@prisma/client';

export const creatorScoreService = {
  /**
   * Recalculates the creator score for a given user and persists it.
   *
   * Formula:
   *   score = (likes + 0.3*comments + 5*trending - 0.5*dislikes - 5*reports) / max(1, total_published_posts)
   *
   * "reports" counts only ContentReports with status 'reviewed' or 'actioned' on the
   * user's published content — pending and dismissed reports are ignored to avoid
   * penalising creators for false or unverified complaints.
   *
   * Clamped to [0, 100]. Defaults to 50 for users with no published posts.
   *
   * @returns The new score as a plain number.
   */
  async recalculate(userId: string): Promise<number> {
    const agg = await prisma.content.aggregate({
      where: { userId, moderationStatus: 'published' },
      _sum: { likeCount: true, commentCount: true, dislikeCount: true },
      _count: { id: true },
    });

    const trendingCount = await prisma.content.count({
      where: { userId, moderationStatus: 'published', isTrending: true },
    });

    const reportCount = await prisma.contentReport.count({
      where: {
        content: { userId, moderationStatus: 'published' },
        status: { in: ['reviewed', 'actioned'] },
      },
    });

    const posts = agg._count.id;
    if (posts === 0) return 50;

    const raw =
      ((agg._sum.likeCount ?? 0) +
        0.3 * (agg._sum.commentCount ?? 0) +
        5 * trendingCount -
        0.5 * (agg._sum.dislikeCount ?? 0) -
        5 * reportCount) /
      posts;

    const clamped = Math.max(0, Math.min(100, raw));

    await prisma.user.update({
      where: { id: userId },
      data: { creatorScore: new Prisma.Decimal(clamped) },
    });

    return clamped;
  },
};
