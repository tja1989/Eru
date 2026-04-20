import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { DAILY_POINTS_GOAL, POINTS_EXPIRY_WARNING_DAYS, getNextTier, TIER_CONFIGS } from '@eru/shared';
import type { WalletResponse, WalletHistoryResponse, WalletExpiringResponse } from '@eru/shared';

export async function walletRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /wallet — full wallet overview with balance, streak, tier progress
  // -------------------------------------------------------------------------
  app.get('/wallet', async (request): Promise<WalletResponse> => {
    const userId = request.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentBalance: true,
        lifetimePoints: true,
        streakDays: true,
        tier: true,
      },
    });

    if (!user) throw Errors.notFound('User');

    // Calculate how many points the user has earned today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayLedger = await prisma.pointsLedger.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        points: { gt: 0 }, // Only count earned points, not deductions
      },
      _sum: { points: true },
    });

    const dailyEarned = todayLedger._sum.points ?? 0;

    // Calculate tier progress toward the next tier
    const nextTier = getNextTier(user.tier);
    const currentTierConfig = TIER_CONFIGS[user.tier];
    const nextTierConfig = nextTier ? TIER_CONFIGS[nextTier] : null;

    let tierProgress = 1.0; // 100% = already at max tier
    if (nextTierConfig) {
      const pointsInCurrentTier = user.lifetimePoints - currentTierConfig.threshold;
      const pointsNeededForNext = nextTierConfig.threshold - currentTierConfig.threshold;
      tierProgress = Math.min(pointsInCurrentTier / pointsNeededForNext, 1.0);
    }

    // Count points expiring within the warning window, and find the earliest
    // expiry date so we can surface "X pts expiring in N days" on the wallet.
    const expiryWarningDate = new Date(Date.now() + POINTS_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);
    const expiringAgg = await prisma.pointsLedger.aggregate({
      where: {
        userId,
        expiresAt: {
          gte: new Date(),
          lte: expiryWarningDate,
        },
        points: { gt: 0 },
      },
      _sum: { points: true },
      _min: { expiresAt: true },
    });

    const expiringPoints = expiringAgg._sum.points ?? 0;
    const expiringDays = expiringAgg._min.expiresAt
      ? Math.max(
          0,
          Math.ceil(
            (expiringAgg._min.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
          ),
        )
      : null;

    // Absolute points-to-next-tier (a simpler companion to `tierProgress` which
    // is a 0-1 fraction). Mobile screens render this as "N pts away".
    const pointsToNext = nextTier
      ? Math.max(0, TIER_CONFIGS[nextTier].threshold - user.lifetimePoints)
      : 0;

    return {
      wallet: {
        balance: user.currentBalance,
        rupeeValue: user.currentBalance * 0.01,
        dailyEarned,
        dailyGoal: DAILY_POINTS_GOAL,
        streak: user.streakDays,
        tier: user.tier,
        currentTier: user.tier,
        nextTier,
        pointsToNext,
        tierProgress,
        lifetimePoints: user.lifetimePoints,
        expiringPoints,
        expiringDays,
      },
    };
  });

  // -------------------------------------------------------------------------
  // GET /wallet/history — paginated points ledger
  // -------------------------------------------------------------------------
  app.get('/wallet/history', async (request): Promise<WalletHistoryResponse> => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = paginationSchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const userId = request.userId;

    const [entries, total] = await Promise.all([
      prisma.pointsLedger.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          points: true,
          actionType: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      prisma.pointsLedger.count({ where: { userId } }),
    ]);

    return {
      data: entries,
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  // -------------------------------------------------------------------------
  // GET /wallet/expiring — points expiring within 30 days
  // -------------------------------------------------------------------------
  app.get('/wallet/expiring', async (request): Promise<WalletExpiringResponse> => {
    const userId = request.userId;
    const now = new Date();
    const expiryWarningDate = new Date(Date.now() + POINTS_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000);

    const expiringEntries = await prisma.pointsLedger.findMany({
      where: {
        userId,
        expiresAt: {
          gte: now,
          lte: expiryWarningDate,
        },
        points: { gt: 0 },
      },
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true,
        points: true,
        actionType: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const totalExpiring = expiringEntries.reduce((sum, e) => sum + e.points, 0);

    return {
      expiringEntries,
      totalExpiring,
      warningDays: POINTS_EXPIRY_WARNING_DAYS,
    };
  });
}
