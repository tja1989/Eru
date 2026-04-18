import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { badgesService } from '../services/badgesService.js';

export async function badgesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/badges', async (request) => {
    const badges = await badgesService.listWithStatus(request.userId);
    return { badges };
  });

  app.post('/badges/check', async (request) => {
    await badgesService.checkAndUnlock(request.userId);
    return { success: true };
  });
}
