import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { spinService } from '../services/spinService.js';

export async function spinRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/spin', async (request) => {
    return spinService.spin(request.userId);
  });

  app.get('/spin/status', async (request) => {
    const canSpin = await spinService.canSpin(request.userId);
    return { canSpin };
  });
}
