import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { watchlistService } from '../services/watchlistService.js';
import { Errors } from '../utils/errors.js';
import { prisma } from '../utils/prisma.js';
import type {
  GetWatchlistResponse,
  AddWatchlistResponse,
} from '@eru/shared';

const addSchema = z.object({ businessId: z.string().uuid() });
const notifySchema = z.object({ notifyOnOffers: z.boolean() });

export async function watchlistRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/watchlist', async (req, reply): Promise<AddWatchlistResponse> => {
    const parsed = addSchema.safeParse(req.body);
    if (!parsed.success) throw Errors.badRequest('Invalid businessId');
    const { businessId } = parsed.data;
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) throw Errors.notFound('business');
    const entry = await watchlistService.add(req.userId, businessId);
    reply.code(201);
    return { entry };
  });

  app.get('/watchlist', async (req): Promise<GetWatchlistResponse> => {
    return watchlistService.listForUser(req.userId);
  });

  app.delete('/watchlist/:businessId', async (req, reply) => {
    const { businessId } = req.params as { businessId: string };
    try {
      await watchlistService.remove(req.userId, businessId);
    } catch {
      throw Errors.notFound('watchlist entry');
    }
    return reply.code(204).send();
  });

  app.patch('/watchlist/:businessId', async (req) => {
    const { businessId } = req.params as { businessId: string };
    const parsed = notifySchema.safeParse(req.body);
    if (!parsed.success) throw Errors.badRequest('Invalid body');
    await watchlistService.setNotifyPreference(req.userId, businessId, parsed.data.notifyOnOffers);
    return { ok: true };
  });
}
