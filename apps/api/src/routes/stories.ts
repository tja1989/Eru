import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { storiesService } from '../services/storiesService.js';

export async function storiesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/stories', async (request) => {
    const stories = await storiesService.feed(request.userId);
    return { stories };
  });

  app.post('/stories', async (request, reply) => {
    const { mediaUrl, thumbnailUrl } = request.body as { mediaUrl: string; thumbnailUrl?: string };
    const story = await storiesService.post(request.userId, mediaUrl, thumbnailUrl ?? null);
    return reply.status(201).send({ story });
  });

  app.post('/stories/:id/view', async (request) => {
    const { id } = request.params as { id: string };
    await storiesService.markViewed(id, request.userId);
    return { success: true };
  });
}
