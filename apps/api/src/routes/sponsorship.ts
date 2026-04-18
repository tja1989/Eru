import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { sponsorshipService } from '../services/sponsorshipService.js';

export async function sponsorshipRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/sponsorship/dashboard', async (request) => {
    return sponsorshipService.getCreatorDashboard(request.userId);
  });

  app.post('/sponsorship/:id/accept', async (request) => {
    const { id } = request.params as { id: string };
    const proposal = await sponsorshipService.accept(id, request.userId);
    return { proposal };
  });

  app.post('/sponsorship/:id/decline', async (request) => {
    const { id } = request.params as { id: string };
    const proposal = await sponsorshipService.decline(id, request.userId);
    return { proposal };
  });
}
