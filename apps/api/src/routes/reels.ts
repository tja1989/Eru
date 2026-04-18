import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { reelsQuerySchema, commentSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function reelsRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /reels — paginated reels with tab filter (foryou/following/local)
  // -------------------------------------------------------------------------
  app.get('/reels', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = reelsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { page, limit, tab } = parsed.data;
    const userId = request.userId;
    const skip = (page - 1) * limit;

    let where: Record<string, unknown> = {
      type: 'reel',
      moderationStatus: 'published',
    };

    if (tab === 'following') {
      // Only reels from users the current user follows
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);
      where.userId = { in: followingIds };
    } else if (tab === 'local') {
      // Only reels from users in the same pincode
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { primaryPincode: true },
      });
      if (currentUser?.primaryPincode) {
        where.locationPincode = currentUser.primaryPincode;
      }
    }
    // 'foryou' uses no additional filter — returns all published reels

    const reels = await prisma.content.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { viewCount: 'desc' },
        { likeCount: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        media: true,
        user: {
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

    // Check which reels the current user has liked — batch lookup for efficiency
    const reelIds = reels.map((r) => r.id);
    const likedInteractions = await prisma.interaction.findMany({
      where: {
        userId,
        contentId: { in: reelIds },
        type: 'like',
      },
      select: { contentId: true },
    });
    const likedSet = new Set(likedInteractions.map((i) => i.contentId));

    // Check which creators the current user follows — batch lookup so the
    // FollowButton on the reel card can render with the correct initial state.
    const creatorIds = Array.from(new Set(reels.map((r) => r.user.id)));
    const follows = await prisma.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: creatorIds },
      },
      select: { followingId: true },
    });
    const followingSet = new Set(follows.map((f) => f.followingId));

    const reelsWithLiked = reels.map((reel) => ({
      ...reel,
      isLiked: likedSet.has(reel.id),
      user: {
        ...reel.user,
        isFollowing: followingSet.has(reel.user.id),
      },
    }));

    const total = await prisma.content.count({ where });

    // Normalise to the standard PaginatedResponse shape {data, nextPage, total}
    return {
      data: reelsWithLiked,
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  // -------------------------------------------------------------------------
  // POST /reels/:id/like — like a reel
  // -------------------------------------------------------------------------
  app.post('/reels/:id/like', {
    preHandler: [rateLimitByUser(60, '1 m')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, type: true },
    });
    if (!content) throw Errors.notFound('Reel');
    if (content.type !== 'reel') throw Errors.badRequest('Content is not a reel');

    try {
      await prisma.$transaction([
        prisma.interaction.create({
          data: { userId: currentUserId, contentId, type: 'like' },
        }),
        prisma.content.update({
          where: { id: contentId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
    } catch (error: unknown) {
      // P2002 = unique constraint violation — already liked
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw Errors.conflict('You have already liked this reel');
      }
      throw error;
    }

    return reply.status(201).send({ success: true });
  });

  // -------------------------------------------------------------------------
  // POST /reels/:id/comments — add a comment to a reel
  // -------------------------------------------------------------------------
  app.post('/reels/:id/comments', {
    preHandler: [rateLimitByUser(30, '1 m')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };

    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { text, parentId } = parsed.data;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, type: true },
    });
    if (!content) throw Errors.notFound('Reel');
    if (content.type !== 'reel') throw Errors.badRequest('Content is not a reel');

    // Validate parent comment exists if this is a reply
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent || parent.contentId !== contentId) {
        throw Errors.notFound('Parent comment');
      }
    }

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          userId: request.userId,
          contentId,
          text,
          parentId: parentId ?? null,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, avatarUrl: true },
          },
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return reply.status(201).send({ comment });
  });
}
