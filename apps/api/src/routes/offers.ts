import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { offersQuerySchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';
import { rewardsService } from '../services/rewardsService.js';
import type { ListOffersResponse, ClaimOfferResponse } from '@eru/shared';

export async function offerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/offers', async (request): Promise<ListOffersResponse> => {
    const parsed = offersQuerySchema.safeParse(request.query as Record<string, string>);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);

    const { type, pincode, page, limit } = parsed.data;
    const where: any = { isActive: true, validUntil: { gte: new Date() } };
    if (type !== 'all') where.type = type;
    if (pincode) where.OR = [{ business: { pincode } }, { businessId: null }];

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { business: true },
      }),
      prisma.offer.count({ where }),
    ]);

    return {
      offers: offers as unknown as ListOffersResponse['offers'],
      page,
      limit,
      total,
    };
  });

  app.post('/offers/:id/claim', async (request, reply): Promise<ClaimOfferResponse> => {
    const { id } = request.params as { id: string };
    const reward = await rewardsService.claimOffer(request.userId, id);
    reply.code(201);
    return { reward: reward as unknown as ClaimOfferResponse['reward'] };
  });
}
