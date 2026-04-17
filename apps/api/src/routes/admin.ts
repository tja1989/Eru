import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import { moderationDeclineSchema, paginationSchema } from '../utils/validators.js';
import { approveContent, declineContent } from '../services/moderationService.js';
import { Errors } from '../utils/errors.js';

export async function adminRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication + admin role
  app.addHook('preHandler', authMiddleware);
  app.addHook('preHandler', adminMiddleware);

  /**
   * GET /admin/moderation/queue
   * Returns paginated list of pending and appealed items.
   * Each item includes the full content row, its media, and the creator's user info.
   */
  app.get('/admin/moderation/queue', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const paginationParsed = paginationSchema.safeParse(rawQuery);
    if (!paginationParsed.success) {
      throw Errors.badRequest(paginationParsed.error.issues[0].message);
    }

    const { page, limit } = paginationParsed.data;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.moderationQueue.findMany({
        where: {
          decision: null, // only unreviewed items
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' }, // oldest first (FIFO review order)
        include: {
          content: {
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
          },
        },
      }),
      prisma.moderationQueue.count({ where: { decision: null } }),
    ]);

    return {
      data: items,
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  /**
   * GET /admin/moderation/:id
   * Returns the full detail of one moderation queue entry,
   * including AI check results, content, media, and creator.
   */
  app.get('/admin/moderation/:id', async (request) => {
    const { id } = request.params as { id: string };

    const item = await prisma.moderationQueue.findUnique({
      where: { id },
      include: {
        content: {
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
        },
      },
    });

    if (!item) throw Errors.notFound('Moderation queue item');

    return { item };
  });

  /**
   * POST /admin/moderation/:id/approve
   * Approves a pending moderation entry.
   * Publishes the content and credits creator +30 pts.
   */
  app.post('/admin/moderation/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      await approveContent(id, request.userId);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Queue entry not found') throw Errors.notFound('Moderation queue item');
      if (msg === 'Already reviewed') throw Errors.conflict('This item has already been reviewed');
      throw error;
    }

    return reply.status(200).send({ success: true });
  });

  /**
   * POST /admin/moderation/:id/decline
   * Declines a pending moderation entry with a required reason code.
   * Body: { code: 'MOD-01' } through 'MOD-07'
   */
  app.post('/admin/moderation/:id/decline', async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = moderationDeclineSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { code } = parsed.data;

    try {
      await declineContent(id, request.userId, code);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg === 'Queue entry not found') throw Errors.notFound('Moderation queue item');
      if (msg === 'Already reviewed') throw Errors.conflict('This item has already been reviewed');
      throw error;
    }

    return reply.status(200).send({ success: true });
  });

  /**
   * GET /admin/moderation/stats
   * Returns today's moderation activity counts:
   * reviewed (total decisions today), approved, declined, and currently pending.
   */
  app.get('/admin/moderation/stats', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [reviewed, approved, declined, pending] = await Promise.all([
      // Total decisions made today
      prisma.moderationQueue.count({
        where: { reviewedAt: { gte: today, lt: tomorrow } },
      }),
      // Approved today
      prisma.moderationQueue.count({
        where: {
          decision: 'approved',
          reviewedAt: { gte: today, lt: tomorrow },
        },
      }),
      // Declined today
      prisma.moderationQueue.count({
        where: {
          decision: 'declined',
          reviewedAt: { gte: today, lt: tomorrow },
        },
      }),
      // Still waiting for a decision
      prisma.moderationQueue.count({
        where: { decision: null },
      }),
    ]);

    return { reviewed, approved, declined, pending };
  });
}
