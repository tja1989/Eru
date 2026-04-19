import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { feedQuerySchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { getFeed } from '../services/feedAlgorithm.js';
import { getRedis } from '../utils/redis.js';
import { feedCache } from '../utils/feedCache.js';

export async function feedRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /feed — personalised scored feed
  // -------------------------------------------------------------------------
  app.get('/feed', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = feedQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { page, limit } = parsed.data;
    const userId = request.userId;

    // Fetch the current user's pincode, interests, and who they follow
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        primaryPincode: true,
        interests: true,
        following: {
          select: { followingId: true },
        },
      },
    });

    if (!user) throw Errors.notFound('User');

    const followingIds = user.following.map((f) => f.followingId);

    // Cache the heavy 200-candidate scoring per (user, page) for 60s. Likes
    // / follows the user makes will visibly update on the next 60s window.
    const cacheKey = feedCache.userFeedKey(userId, page);
    const feedPage = await feedCache.getOrCompute(cacheKey, 60, () =>
      getFeed(
        {
          userId,
          pincode: user.primaryPincode,
          interests: user.interests,
          followingIds,
        },
        page,
        limit,
      ),
    );

    return {
      data: feedPage.items,
      nextPage: feedPage.page * feedPage.limit < feedPage.total ? feedPage.page + 1 : null,
      total: feedPage.total,
    };
  });

  // -------------------------------------------------------------------------
  // GET /wallet/summary — balance (Redis-cached), streak, and tier
  // -------------------------------------------------------------------------
  app.get('/wallet/summary', async (request) => {
    const userId = request.userId;

    let balance: number | null = null;

    // Try Redis cache first — a cheap lookup before hitting the DB
    try {
      const redis = getRedis();
      const cached = await redis.get<number>(`balance:${userId}`);
      if (cached !== null && cached !== undefined) {
        balance = cached;
      }
    } catch {
      // Redis is optional; fall through to DB
    }

    // If no cached value, read from the database and refresh the cache
    if (balance === null) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentBalance: true, streakDays: true, tier: true },
      });

      if (!user) throw Errors.notFound('User');

      balance = user.currentBalance;

      // Repopulate cache (fire-and-forget — never block the response)
      try {
        const redis = getRedis();
        redis.set(`balance:${userId}`, balance, { ex: 300 }).catch(() => {});
      } catch {
        // Redis errors are non-fatal
      }

      return { balance, streak: user.streakDays, tier: user.tier };
    }

    // Balance came from cache; still need streak + tier from DB
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { streakDays: true, tier: true },
    });

    if (!user) throw Errors.notFound('User');

    return { balance, streak: user.streakDays, tier: user.tier };
  });
}
