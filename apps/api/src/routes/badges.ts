import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { badgesService } from '../services/badgesService.js';
import type { BadgesResponse, BadgesCheckResponse } from '@eru/shared';

export async function badgesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/badges', async (request): Promise<BadgesResponse> => {
    const badges = await badgesService.listWithStatus(request.userId);
    return { badges: badges as unknown as BadgesResponse['badges'] };
  });

  app.post('/badges/check', async (request): Promise<BadgesCheckResponse> => {
    await badgesService.checkAndUnlock(request.userId);
    return { success: true };
  });
}
