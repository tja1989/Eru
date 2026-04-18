import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { locationsService } from '../services/locationsService.js';
import { Errors } from '../utils/errors.js';

export async function locationsRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // GET /locations?q=<query> — autocomplete search for pincodes by area or district
  app.get('/locations', async (request, reply) => {
    const querySchema = z.object({ q: z.string().min(2).max(50) });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      throw Errors.badRequest('Missing or invalid query');
    }

    const results = locationsService.search(parsed.data.q);
    return reply.send({ results });
  });
}
