import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { earnSchema } from '../utils/validators.js';
import { earnPoints } from '../services/pointsEngine.js';
import { Errors } from '../utils/errors.js';
import type { ActionType } from '@eru/shared';

export async function actionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post(
    '/actions/earn',
    { preHandler: [rateLimitByUser(30, '1m')] },
    async (request) => {
      const parsed = earnSchema.safeParse(request.body);
      if (!parsed.success) {
        throw Errors.badRequest(parsed.error.issues[0].message);
      }

      const { actionType, contentId, metadata } = parsed.data;
      return earnPoints(request.userId, actionType as ActionType, contentId, metadata);
    },
  );
}
