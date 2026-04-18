import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';
import { rewardsService } from '../services/rewardsService.js';
import { z } from 'zod';

export async function rewardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  const statusSchema = z.object({
    status: z.enum(['active', 'used', 'expired']).optional(),
  });

  app.get('/rewards', async (request) => {
    const parsed = statusSchema.safeParse(request.query);
    if (!parsed.success) throw Errors.badRequest('Invalid status');
    const rewards = await rewardsService.listUserRewards(request.userId, parsed.data.status);
    return { rewards };
  });

  app.put('/rewards/:id/use', async (request) => {
    const { id } = request.params as { id: string };
    const reward = await rewardsService.markUsed(request.userId, id);
    return { reward };
  });
}
