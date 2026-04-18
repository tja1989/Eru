import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

export async function businessRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/business/:id', async (request) => {
    const { id } = request.params as { id: string };
    const biz = await prisma.business.findUnique({
      where: { id },
      include: {
        offers: {
          where: { isActive: true, validUntil: { gte: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!biz) throw Errors.notFound('Business');
    return { business: biz };
  });
}
