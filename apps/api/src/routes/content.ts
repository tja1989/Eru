import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { createContentSchema, commentSchema, paginationSchema, reportContentSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function contentRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // POST /content/create — create new content and link any pre-uploaded media
  app.post('/content/create', {
    preHandler: [rateLimitByUser(20, '1 m')],
  }, async (request, reply) => {
    const parsed = createContentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { type, text, mediaIds, hashtags, locationPincode, pollOptions, threadParts } = parsed.data;

    // Create the content row and any poll options / thread parts atomically so we
    // never end up with a poll that has zero options or a thread that's missing parts.
    const content = await prisma.$transaction(async (tx) => {
      const created = await tx.content.create({
        data: {
          userId: request.userId,
          type,
          text: type === 'thread' && threadParts ? threadParts[0] : text,
          hashtags,
          locationPincode,
          moderationStatus: 'pending',
          threadPosition: type === 'thread' ? 0 : null,
          threadParentId: null,
        },
      });

      if (type === 'poll' && pollOptions && pollOptions.length > 0) {
        await Promise.all(
          pollOptions.map((optText, idx) =>
            tx.pollOption.create({
              data: {
                contentId: created.id,
                text: optText,
                sortOrder: idx,
              },
            })
          )
        );
      }

      if (type === 'thread' && threadParts && threadParts.length > 1) {
        await Promise.all(
          threadParts.slice(1).map((partText, idx) =>
            tx.content.create({
              data: {
                userId: request.userId,
                type: 'thread',
                text: partText,
                hashtags,
                locationPincode,
                moderationStatus: 'pending',
                threadParentId: created.id,
                threadPosition: idx + 1,
              },
            })
          )
        );
      }

      return created;
    });

    // Link any pre-uploaded media to this new content row
    if (mediaIds.length > 0) {
      await prisma.contentMedia.updateMany({
        where: {
          id: { in: mediaIds },
          // Only allow linking media that is still using the placeholder contentId
          contentId: '00000000-0000-0000-0000-000000000000',
        },
        data: { contentId: content.id },
      });
    }

    // Also create the moderation queue entry for human review
    await prisma.moderationQueue.create({
      data: { contentId: content.id },
    });

    return reply.status(201).send({ content });
  });

  // GET /content/:id — fetch a single piece of content with full details
  app.get('/content/:id', async (request) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.userId;

    const content = await prisma.content.findUnique({
      where: { id },
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

    if (!content) {
      throw Errors.notFound('Content');
    }

    // Non-authors can only see published content
    if (content.moderationStatus !== 'published' && content.userId !== currentUserId) {
      throw Errors.notFound('Content');
    }

    // Soft-deleted content is hidden from everyone except the author
    if (content.deletedAt && content.userId !== currentUserId) {
      throw Errors.notFound('Content');
    }

    // Check if the current user has liked, disliked, or saved this content
    const [likeInteraction, saveInteraction, dislikeInteraction] = await Promise.all([
      prisma.interaction.findUnique({
        where: {
          userId_contentId_type: { userId: currentUserId, contentId: id, type: 'like' },
        },
      }),
      prisma.interaction.findUnique({
        where: {
          userId_contentId_type: { userId: currentUserId, contentId: id, type: 'save' },
        },
      }),
      prisma.interaction.findUnique({
        where: {
          userId_contentId_type: { userId: currentUserId, contentId: id, type: 'dislike' },
        },
      }),
    ]);

    // Fetch a preview of the 3 most recent top-level comments
    const commentsPreview = await prisma.comment.findMany({
      where: { contentId: id, parentId: null },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });

    // For poll content, fetch options and the current user's vote
    let pollOptions: Array<{ id: string; text: string; sortOrder: number; voteCount: number }> | undefined;
    let userVote: string | null = null;

    if (content.type === 'poll') {
      const options = await prisma.pollOption.findMany({
        where: { contentId: id },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, text: true, sortOrder: true, voteCount: true },
      });
      pollOptions = options;

      // Find which option (if any) this user voted for
      const vote = await prisma.pollVote.findFirst({
        where: {
          userId: currentUserId,
          pollOption: { contentId: id },
        },
        select: { pollOptionId: true },
      });
      userVote = vote?.pollOptionId ?? null;
    }

    return {
      content: {
        ...content,
        isLiked: likeInteraction !== null,
        isDisliked: dislikeInteraction !== null,
        isSaved: saveInteraction !== null,
        commentsPreview,
        ...(content.type === 'poll' && { pollOptions, userVote }),
      },
    };
  });

  // GET /content/:id/thread — fetch the full thread (parent + all parts in order)
  // Accepts either the parent id or any child part id; always resolves to the parent first.
  app.get('/content/:id/thread', async (request) => {
    const { id } = request.params as { id: string };

    // Look up the given id — could be the parent or a child
    const target = await prisma.content.findUnique({ where: { id } });
    if (!target || target.type !== 'thread') {
      throw Errors.notFound('Thread');
    }

    // Resolve to the parent: if this row itself IS the parent, use it;
    // otherwise walk up via threadParentId
    let parentId: string;
    if (target.threadParentId === null) {
      parentId = target.id;
    } else {
      parentId = target.threadParentId;
    }

    // Fetch the parent row
    const parent = await prisma.content.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw Errors.notFound('Thread');
    }

    // Fetch all parts: the parent (position 0) + all children, sorted by threadPosition
    const children = await prisma.content.findMany({
      where: { threadParentId: parentId },
      orderBy: { threadPosition: 'asc' },
    });

    const parts = [parent, ...children];

    return { parent, parts };
  });

  // DELETE /content/:id — soft-delete own content (sets deletedAt; PointsLedger preserved)
  app.delete('/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw Errors.notFound('Content');
    if (content.userId !== request.userId) throw Errors.forbidden();
    // Idempotent: if already soft-deleted, treat as success
    if (content.deletedAt) return reply.status(200).send({ success: true });

    await prisma.content.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return reply.status(200).send({ success: true });
  });

  // POST /content/:id/resubmit — re-queue a declined post for moderation (max 4 queue entries)
  app.post('/content/:id/resubmit', async (request, reply) => {
    const { id } = request.params as { id: string };

    const content = await prisma.content.findUnique({
      where: { id },
      include: { _count: { select: { moderationQueue: true } } },
    });

    if (!content) throw Errors.notFound('Content');
    if (content.userId !== request.userId) throw Errors.forbidden();
    if (content.moderationStatus !== 'declined') {
      throw Errors.badRequest('Only declined content can be resubmitted');
    }
    if (content._count.moderationQueue >= 4) {
      throw Errors.badRequest('Maximum resubmission limit (4) reached');
    }

    // Reset to pending and add a new moderation queue entry in a transaction
    const [updated] = await prisma.$transaction([
      prisma.content.update({
        where: { id },
        data: { moderationStatus: 'pending', declineReason: null },
      }),
      prisma.moderationQueue.create({
        data: { contentId: id },
      }),
    ]);

    return reply.status(200).send({ content: updated });
  });

  // POST /content/:id/appeal — appeal a moderation decision
  app.post('/content/:id/appeal', async (request, reply) => {
    const { id } = request.params as { id: string };

    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) throw Errors.notFound('Content');
    if (content.userId !== request.userId) throw Errors.forbidden();
    if (content.moderationStatus !== 'declined') {
      throw Errors.badRequest('Only declined content can be appealed');
    }

    // Check for an existing appeal to prevent duplicates
    const existingAppeal = await prisma.moderationQueue.findFirst({
      where: { contentId: id, isAppeal: true },
    });

    if (existingAppeal) {
      throw Errors.conflict('An appeal already exists for this content');
    }

    const appealEntry = await prisma.moderationQueue.create({
      data: { contentId: id, isAppeal: true },
    });

    return reply.status(201).send({ appeal: appealEntry });
  });

  // POST /posts/:id/like — like a piece of content
  app.post('/posts/:id/like', {
    preHandler: [rateLimitByUser(60, '1 m')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');

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
        throw Errors.conflict('You have already liked this content');
      }
      throw error;
    }

    return reply.status(201).send({ success: true });
  });

  // DELETE /posts/:id/unlike — remove a like from content
  app.delete('/posts/:id/unlike', async (request) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const interaction = await prisma.interaction.findUnique({
      where: {
        userId_contentId_type: { userId: currentUserId, contentId, type: 'like' },
      },
    });

    if (!interaction) {
      throw Errors.notFound('Like');
    }

    await prisma.$transaction([
      prisma.interaction.delete({
        where: {
          userId_contentId_type: { userId: currentUserId, contentId, type: 'like' },
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  });

  // POST /posts/:id/dislike — dislike a piece of content
  app.post('/posts/:id/dislike', {
    preHandler: [rateLimitByUser(60, '1 m')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');

    try {
      await prisma.$transaction([
        prisma.interaction.create({
          data: { userId: currentUserId, contentId, type: 'dislike' },
        }),
        prisma.content.update({
          where: { id: contentId },
          data: { dislikeCount: { increment: 1 } },
        }),
      ]);
    } catch (error: unknown) {
      // P2002 = unique constraint violation — already disliked
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw Errors.conflict('You have already disliked this content');
      }
      throw error;
    }

    return reply.status(201).send({ success: true });
  });

  // DELETE /posts/:id/undislike — remove a dislike from content
  app.delete('/posts/:id/undislike', async (request) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const interaction = await prisma.interaction.findUnique({
      where: {
        userId_contentId_type: { userId: currentUserId, contentId, type: 'dislike' },
      },
    });

    if (!interaction) {
      throw Errors.notFound('Dislike');
    }

    await prisma.$transaction([
      prisma.interaction.delete({
        where: {
          userId_contentId_type: { userId: currentUserId, contentId, type: 'dislike' },
        },
      }),
      prisma.content.update({
        where: { id: contentId },
        data: { dislikeCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  });

  // POST /posts/:id/save — bookmark a piece of content (private; no saveCount column)
  app.post('/posts/:id/save', {
    preHandler: [rateLimitByUser(60, '1 m')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');

    try {
      await prisma.interaction.create({
        data: { userId: currentUserId, contentId, type: 'save' },
      });
    } catch (error: unknown) {
      // P2002 = unique constraint violation — already saved
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw Errors.conflict('You have already saved this content');
      }
      throw error;
    }

    return reply.status(201).send({ success: true });
  });

  // DELETE /posts/:id/unsave — remove a bookmark
  app.delete('/posts/:id/unsave', async (request) => {
    const { id: contentId } = request.params as { id: string };
    const currentUserId = request.userId;

    const interaction = await prisma.interaction.findUnique({
      where: {
        userId_contentId_type: { userId: currentUserId, contentId, type: 'save' },
      },
    });

    if (!interaction) {
      throw Errors.notFound('Save');
    }

    await prisma.interaction.delete({
      where: {
        userId_contentId_type: { userId: currentUserId, contentId, type: 'save' },
      },
    });

    return { success: true };
  });

  // POST /posts/:id/comments — add a comment (top-level or threaded reply)
  app.post('/posts/:id/comments', {
    preHandler: [rateLimitByUser(30, '1 m')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };

    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { text, parentId } = parsed.data;

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');

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

  // GET /posts/:id/comments — paginated comments with threaded replies
  app.get('/posts/:id/comments', async (request) => {
    const { id: contentId } = request.params as { id: string };
    const rawQuery = request.query as Record<string, string>;

    const paginationParsed = paginationSchema.safeParse(rawQuery);
    if (!paginationParsed.success) {
      throw Errors.badRequest(paginationParsed.error.issues[0].message);
    }

    const { page, limit } = paginationParsed.data;
    const skip = (page - 1) * limit;

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');

    // Fetch top-level comments (no parentId) with pagination
    const topLevelComments = await prisma.comment.findMany({
      where: { contentId, parentId: null },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
        // Include up to 3 replies per top-level comment
        replies: {
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const total = await prisma.comment.count({ where: { contentId, parentId: null } });

    return { comments: topLevelComments, page, limit, total };
  });

  // POST /content/:id/report — flag content for moderation review
  app.post('/content/:id/report', {
    preHandler: [rateLimitByUser(10, '1 h')],
  }, async (request, reply) => {
    const { id: contentId } = request.params as { id: string };
    const parsed = reportContentSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');

    try {
      const report = await prisma.contentReport.create({
        data: {
          contentId,
          reporterId: request.userId,
          reason: parsed.data.reason,
          notes: parsed.data.notes,
        },
      });
      return reply.status(201).send({ report });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw Errors.conflict('You have already reported this content');
      }
      throw error;
    }
  });
}
