import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { updateSettingsSchema, paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function userRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // GET /users/me/content-summary — aggregate counts + total likes for current user
  // NOTE: this route is registered BEFORE /users/:id/* so Fastify doesn't treat
  // "me" as an :id param.
  app.get('/users/me/content-summary', async (request) => {
    const userId = request.userId;

    const [grouped, likesAgg] = await Promise.all([
      prisma.content.groupBy({
        by: ['moderationStatus'],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.content.aggregate({
        where: { userId, moderationStatus: 'published' },
        _sum: { likeCount: true },
      }),
    ]);

    const statusMap: Record<string, number> = { published: 0, pending: 0, declined: 0 };
    for (const row of grouped) {
      statusMap[row.moderationStatus] = row._count._all;
    }

    return {
      summary: {
        published: statusMap.published,
        pending: statusMap.pending,
        declined: statusMap.declined,
        totalLikes: likesAgg._sum.likeCount ?? 0,
      },
    };
  });

  // GET /users/:id/profile — public profile with counts and follow status
  app.get('/users/:id/profile', async (request) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
        tier: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: {
            content: { where: { moderationStatus: 'published' } },
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw Errors.notFound('User');
    }

    // Check if the current authenticated user follows this profile
    const isFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: request.userId,
          followingId: id,
        },
      },
    });

    return {
      user: {
        ...user,
        postCount: user._count.content,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        isFollowing: isFollowing !== null,
        _count: undefined,
      },
    };
  });

  // POST /users/:id/follow — follow a user
  app.post('/users/:id/follow', {
    preHandler: [rateLimitByUser(30, '1 m')],
  }, async (request, reply) => {
    const { id: targetId } = request.params as { id: string };
    const currentUserId = request.userId;

    if (targetId === currentUserId) {
      throw Errors.badRequest('You cannot follow yourself');
    }

    // Verify target user exists
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) {
      throw Errors.notFound('User');
    }

    try {
      await prisma.follow.create({
        data: {
          followerId: currentUserId,
          followingId: targetId,
        },
      });
    } catch (error: unknown) {
      // P2002 = unique constraint violation — already following
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw Errors.conflict('You are already following this user');
      }
      throw error;
    }

    return reply.status(201).send({ success: true });
  });

  // DELETE /users/:id/unfollow — unfollow a user
  app.delete('/users/:id/unfollow', async (request) => {
    const { id: targetId } = request.params as { id: string };
    const currentUserId = request.userId;

    const existing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetId,
        },
      },
    });

    if (!existing) {
      throw Errors.notFound('Follow relationship');
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetId,
        },
      },
    });

    return { success: true };
  });

  // GET /users/:id/content — paginated content grid
  app.get('/users/:id/content', async (request) => {
    const { id } = request.params as { id: string };
    const rawQuery = request.query as Record<string, string>;

    const paginationParsed = paginationSchema.safeParse(rawQuery);
    if (!paginationParsed.success) {
      throw Errors.badRequest(paginationParsed.error.issues[0].message);
    }

    const { page, limit } = paginationParsed.data;

    // Default tab is 'posts'; saved requires querying interactions
    const tab = rawQuery.tab ?? 'posts';
    if (!['posts', 'reels', 'created', 'saved'].includes(tab)) {
      throw Errors.badRequest('tab must be one of: posts, reels, created, saved');
    }

    const skip = (page - 1) * limit;
    const baseWhere = { moderationStatus: 'published' as const };

    if (tab === 'saved') {
      // Return content that the current user has saved via interactions
      const interactions = await prisma.interaction.findMany({
        where: {
          userId: request.userId,
          type: 'save',
          content: { ...baseWhere },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          content: {
            include: { media: true },
          },
        },
      });

      return { content: interactions.map((i) => i.content), page, limit };
    }

    // For posts/reels/created tabs — filter by content type and userId
    const typeFilter =
      tab === 'reels' ? { type: 'reel' as const } :
      tab === 'posts' ? { type: 'post' as const } :
      {}; // 'created' = all types

    const content = await prisma.content.findMany({
      where: {
        userId: id,
        ...baseWhere,
        ...typeFilter,
      },
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: { media: true },
    });

    return { content, page, limit };
  });

  // GET /users/:id/followers — paginated list of followers
  app.get('/users/:id/followers', async (request) => {
    const { id } = request.params as { id: string };
    const rawQuery = request.query as Record<string, string>;

    const paginationParsed = paginationSchema.safeParse(rawQuery);
    if (!paginationParsed.success) {
      throw Errors.badRequest(paginationParsed.error.issues[0].message);
    }

    const { page, limit } = paginationParsed.data;
    const skip = (page - 1) * limit;

    const follows = await prisma.follow.findMany({
      where: { followingId: id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
            tier: true,
          },
        },
      },
    });

    return {
      followers: follows.map((f) => ({ ...f.follower, followedAt: f.createdAt })),
      page,
      limit,
    };
  });

  // GET /users/:id/following — paginated list of accounts the user follows
  app.get('/users/:id/following', async (request) => {
    const { id } = request.params as { id: string };
    const rawQuery = request.query as Record<string, string>;

    const paginationParsed = paginationSchema.safeParse(rawQuery);
    if (!paginationParsed.success) {
      throw Errors.badRequest(paginationParsed.error.issues[0].message);
    }

    const { page, limit } = paginationParsed.data;
    const skip = (page - 1) * limit;

    const follows = await prisma.follow.findMany({
      where: { followerId: id },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
            tier: true,
          },
        },
      },
    });

    return {
      following: follows.map((f) => ({ ...f.following, followedAt: f.createdAt })),
      page,
      limit,
    };
  });

  // GET /users/me/settings — full settings for current user
  // NOTE: this route must be registered BEFORE /users/:id/* routes so Fastify
  // doesn't treat "me" as an :id param.
  app.get('/users/me/settings', async (request) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        gender: true,
        dob: true,
        primaryPincode: true,
        secondaryPincodes: true,
        interests: true,
        contentLanguages: true,
        appLanguage: true,
        notificationPush: true,
        notificationEmail: true,
        isPrivate: true,
        shareDataWithBrands: true,
        tier: true,
        lifetimePoints: true,
        currentBalance: true,
        streakDays: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw Errors.notFound('User');
    }

    return { settings: user };
  });

  // PUT /users/me/settings — update settings
  app.put('/users/me/settings', async (request) => {
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { dob, ...rest } = parsed.data;

    const updateData: Record<string, unknown> = { ...rest };

    // Convert ISO date string to a proper Date object for Prisma
    if (dob !== undefined) {
      updateData.dob = new Date(dob);
    }

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        gender: true,
        dob: true,
        primaryPincode: true,
        secondaryPincodes: true,
        interests: true,
        contentLanguages: true,
        appLanguage: true,
        notificationPush: true,
        notificationEmail: true,
        isPrivate: true,
        shareDataWithBrands: true,
      },
    });

    return { settings: user };
  });
}
