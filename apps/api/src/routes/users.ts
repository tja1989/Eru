import type { FastifyInstance } from 'fastify';
import type { GetUserProfileResponse, GetUserContentResponse } from '@eru/shared';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { updateSettingsSchema, paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { ACTION_CONFIGS } from '@eru/shared';

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
        where: { userId, deletedAt: null },
        _count: { _all: true },
      }),
      prisma.content.aggregate({
        where: { userId, moderationStatus: 'published', deletedAt: null },
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
  app.get('/users/:id/profile', async (request): Promise<GetUserProfileResponse> => {
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
        creatorScore: true,
        _count: {
          select: {
            content: { where: { moderationStatus: 'published', deletedAt: null } },
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

    const { _count, creatorScore, ...rest } = user;
    return {
      user: {
        ...rest,
        createdAt: rest.createdAt.toISOString(),
        creatorScore: creatorScore != null ? Number(creatorScore) : null,
        postCount: _count.content,
        followerCount: _count.followers,
        followingCount: _count.following,
        isFollowing: isFollowing !== null,
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
  app.get('/users/:id/content', async (request): Promise<GetUserContentResponse> => {
    const { id } = request.params as { id: string };
    const rawQuery = request.query as Record<string, string>;

    const paginationParsed = paginationSchema.safeParse(rawQuery);
    if (!paginationParsed.success) {
      throw Errors.badRequest(paginationParsed.error.issues[0].message);
    }

    const { page, limit } = paginationParsed.data;

    // Default tab is 'posts'; saved requires querying interactions; tagged queries taggedUserIds
    const tab = rawQuery.tab ?? 'posts';
    if (!['posts', 'reels', 'created', 'saved', 'tagged'].includes(tab)) {
      throw Errors.badRequest('tab must be one of: posts, reels, created, saved, tagged');
    }

    const skip = (page - 1) * limit;
    const baseWhere = { moderationStatus: 'published' as const, deletedAt: null };

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

    if (tab === 'tagged') {
      // Return published content where this user appears in taggedUserIds
      const content = await prisma.content.findMany({
        where: {
          ...baseWhere,
          taggedUserIds: { has: id },
        },
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: { media: true },
      });

      return { content, page, limit };
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
        notifyWatchlistOffers: true,
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

  // DELETE /users/me — soft-delete the current user and anonymize their account data
  // The user's posts/content remain in the DB but the display name becomes "Deleted User".
  // The original phone/firebaseUid are replaced with unique sentinel values so the
  // phone number can be re-registered and the original uid can no longer authenticate.
  app.delete('/users/me', async (request, reply) => {
    const userId = request.userId;
    const uuid = crypto.randomUUID();

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        username: `deleted_${uuid}`,
        bio: null,
        avatarUrl: null,
        phone: `deleted_${uuid}_phone`,
        email: null,
        firebaseUid: `deleted_${uuid}`,
        deletedAt: new Date(),
      },
    });

    return reply.status(204).send();
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

    let user;
    try {
      user = await prisma.user.update({
        where: { id: request.userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          username: true,
          bio: true,
          avatarUrl: true,
          gender: true,
          dob: true,
          primaryPincode: true,
          secondaryPincodes: true,
          interests: true,
          contentLanguages: true,
          appLanguage: true,
          notificationPush: true,
          notificationEmail: true,
          notifyWatchlistOffers: true,
          isPrivate: true,
          shareDataWithBrands: true,
        },
      });
    } catch (error: unknown) {
      // P2002 = Prisma unique constraint violation — only treat as username conflict
      // if the violating field is actually "username". Future unique fields (email,
      // phone, etc.) must not produce a misleading "Username already taken" message.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 'P2002' &&
        Array.isArray((error as any).meta?.target) &&
        ((error as any).meta.target as string[]).includes('username')
      ) {
        throw Errors.conflict('Username already taken');
      }
      throw error;
    }

    return { settings: user };
  });

  // POST /users/me/onboarding/complete — credit welcome bonus + first daily check-in.
  // Idempotent at the lifetime level: if a `welcome_bonus` ledger entry already
  // exists for this user, return {pointsCredited: 0} without writing anything.
  app.post('/users/me/onboarding/complete', async (request) => {
    const userId = request.userId;

    // Lifetime idempotency check — a single welcome_bonus per user, ever.
    const existing = await prisma.pointsLedger.findFirst({
      where: { userId, actionType: 'welcome_bonus' },
      select: { id: true },
    });
    if (existing) {
      return { pointsCredited: 0 };
    }

    const welcomePts = ACTION_CONFIGS.welcome_bonus.points;
    const checkinPts = ACTION_CONFIGS.daily_checkin.points;
    const total = welcomePts + checkinPts;

    // Atomic transaction so a partial credit (welcome but not check-in) can't
    // happen on a connection blip mid-write.
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    await prisma.$transaction([
      prisma.pointsLedger.create({
        data: {
          userId,
          actionType: 'welcome_bonus',
          points: welcomePts,
          multiplierApplied: 1,
          expiresAt,
        },
      }),
      prisma.pointsLedger.create({
        data: {
          userId,
          actionType: 'daily_checkin',
          points: checkinPts,
          multiplierApplied: 1,
          expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          lifetimePoints: { increment: total },
          currentBalance: { increment: total },
        },
      }),
    ]);

    return { pointsCredited: total };
  });
}
