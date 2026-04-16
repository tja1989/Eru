import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { leaderboardQuerySchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { getLeaderboard, getUserRank } from '../services/leaderboardService.js';

export async function leaderboardRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /leaderboard — top N users for a given scope and pincode
  // -------------------------------------------------------------------------
  app.get('/leaderboard', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = leaderboardQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { scope, pincode } = parsed.data;

    // If pincode not provided, fall back to the authenticated user's pincode
    let resolvedPincode = pincode;
    if (!resolvedPincode) {
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: { primaryPincode: true },
      });
      if (!user) throw Errors.notFound('User');
      resolvedPincode = user.primaryPincode;
    }

    const rankings = await getLeaderboard(resolvedPincode, scope);

    return { rankings, scope, pincode: resolvedPincode };
  });

  // -------------------------------------------------------------------------
  // GET /leaderboard/me — the current user's rank and score
  // -------------------------------------------------------------------------
  app.get('/leaderboard/me', async (request) => {
    const userId = request.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryPincode: true },
    });

    if (!user) throw Errors.notFound('User');

    // Default scope is pincode — the most local leaderboard
    const scope = 'pincode';
    const result = await getUserRank(userId, user.primaryPincode, scope);

    return { ...result, scope, pincode: user.primaryPincode };
  });

  // -------------------------------------------------------------------------
  // GET /season/current — current season (quarterly) with countdown
  // -------------------------------------------------------------------------
  app.get('/season/current', async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    // Determine which quarter we're in (Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec)
    const quarter = Math.floor(month / 3) + 1;

    const quarterStartMonth = (quarter - 1) * 3; // 0-indexed month
    const quarterEndMonth = quarter * 3 - 1;      // 0-indexed month

    const seasonStart = new Date(year, quarterStartMonth, 1);
    const seasonEnd = new Date(year, quarterEndMonth + 1, 0, 23, 59, 59, 999); // Last day of quarter

    const msUntilEnd = seasonEnd.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msUntilEnd / (1000 * 60 * 60 * 24));

    const seasonName = `Q${quarter} ${year}`;

    return {
      name: seasonName,
      quarter,
      year,
      startDate: seasonStart.toISOString(),
      endDate: seasonEnd.toISOString(),
      daysRemaining: Math.max(0, daysRemaining),
    };
  });

  // -------------------------------------------------------------------------
  // GET /quests/weekly — 5 weekly quests with progress from this week's ledger
  // -------------------------------------------------------------------------
  app.get('/quests/weekly', async (request) => {
    const userId = request.userId;

    // Start of the current week (Monday at midnight)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday ...
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Aggregate this week's points ledger grouped by action type
    const weeklyLedger = await prisma.pointsLedger.groupBy({
      by: ['actionType'],
      where: {
        userId,
        createdAt: { gte: weekStart },
      },
      _count: { actionType: true },
      _sum: { points: true },
    });

    // Build a lookup map for quick access
    const progressMap = new Map(
      weeklyLedger.map((entry) => [
        entry.actionType,
        { count: entry._count.actionType, points: entry._sum.points ?? 0 },
      ])
    );

    // Define the 5 weekly quests with their targets
    const quests = [
      {
        id: 'watch_5_reels',
        title: 'Reel Watcher',
        description: 'Watch 5 reels this week',
        actionType: 'reel_watch',
        targetCount: 5,
        rewardPoints: 50,
      },
      {
        id: 'like_10_posts',
        title: 'Spread the Love',
        description: 'Like 10 posts this week',
        actionType: 'like',
        targetCount: 10,
        rewardPoints: 30,
      },
      {
        id: 'comment_5_posts',
        title: 'Join the Conversation',
        description: 'Comment on 5 posts this week',
        actionType: 'comment',
        targetCount: 5,
        rewardPoints: 75,
      },
      {
        id: 'read_3_articles',
        title: 'Knowledge Seeker',
        description: 'Read 3 articles this week',
        actionType: 'read_article',
        targetCount: 3,
        rewardPoints: 40,
      },
      {
        id: 'create_content',
        title: 'Content Creator',
        description: 'Create 1 piece of content this week',
        actionType: 'create_content',
        targetCount: 1,
        rewardPoints: 100,
      },
    ];

    const questsWithProgress = quests.map((quest) => {
      const progress = progressMap.get(quest.actionType);
      const currentCount = progress?.count ?? 0;
      const isCompleted = currentCount >= quest.targetCount;

      return {
        ...quest,
        currentCount,
        isCompleted,
        progress: Math.min(currentCount / quest.targetCount, 1.0),
      };
    });

    return { quests: questsWithProgress, weekStart: weekStart.toISOString() };
  });
}
