import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { BusinessSearchResponse } from '@eru/shared';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'q is required'),
});

export async function businessRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // Business search — fuzzy case-insensitive name match for the create-screen
  // "Tag a Business" autocomplete. Capped at 10 results to keep the dropdown
  // sane; the real "discover" flow (explore screen) uses a richer endpoint.
  app.get('/businesses/search', async (request): Promise<BusinessSearchResponse> => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }
    const { q } = parsed.data;

    const items = await prisma.business.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 10,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        category: true,
        pincode: true,
        avatarUrl: true,
      },
    });

    return { items };
  });

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
