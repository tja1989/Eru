import type { FastifyInstance } from 'fastify';
import type { WeeklyQuestsResponse } from '@eru/shared';
import { authMiddleware } from '../middleware/auth.js';
import { questsService } from '../services/questsService.js';

export async function questsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/quests/weekly', async (request): Promise<WeeklyQuestsResponse> => {
    const quests = await questsService.getWeeklyProgress(request.userId);
    return { quests };
  });
}
