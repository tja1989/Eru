import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { messagesService } from '../services/messagesService.js';
import { z } from 'zod';
import { Errors } from '../utils/errors.js';

const createConvSchema = z.object({ targetUserId: z.string().uuid() });
const sendSchema = z.object({ text: z.string().min(1).max(2000) });

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/conversations', async (request, reply) => {
    const parsed = createConvSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const conversation = await messagesService.getOrCreateConversation(
      request.userId,
      parsed.data.targetUserId,
    );
    return reply.status(201).send({ conversation });
  });

  app.get('/conversations', async (request) => {
    const conversations = await messagesService.listConversations(request.userId);
    return { conversations };
  });

  app.get('/conversations/:id/messages', async (request) => {
    const { id } = request.params as { id: string };
    const messages = await messagesService.listMessages(id, request.userId);
    return { messages };
  });

  app.post('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = sendSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const message = await messagesService.sendMessage(id, request.userId, parsed.data.text);
    return reply.status(201).send({ message });
  });
}
