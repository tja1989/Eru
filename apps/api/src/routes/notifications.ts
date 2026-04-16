import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { paginationSchema, markReadSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function notificationRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /notifications — paginated notifications with unread count
  // -------------------------------------------------------------------------
  app.get('/notifications', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = paginationSchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const userId = request.userId;

    // Fetch paginated notifications and the total unread count concurrently
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, page, limit, total, unreadCount };
  });

  // -------------------------------------------------------------------------
  // PUT /notifications/read — mark one or more notifications as read
  // -------------------------------------------------------------------------
  app.put('/notifications/read', async (request) => {
    const parsed = markReadSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { ids } = parsed.data;
    const userId = request.userId;

    // Only mark notifications that belong to the current user — security check
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId, // Ensures users can only mark their own notifications as read
      },
      data: { isRead: true },
    });

    return { updated: result.count };
  });
}
