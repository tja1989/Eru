import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { messagesService } from '../services/messagesService.js';
import { z } from 'zod';
import { Errors } from '../utils/errors.js';
import type {
  CreateConversationResponse,
  ListConversationsResponse,
  ListMessagesResponse,
  SendMessageResponse,
} from '@eru/shared';

const createConvSchema = z.object({ targetUserId: z.string().uuid() });
const sendSchema = z.object({ text: z.string().min(1).max(2000) });

export async function messagesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.post('/conversations', async (request, reply): Promise<CreateConversationResponse> => {
    const parsed = createConvSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const conversation = await messagesService.getOrCreateConversation(
      request.userId,
      parsed.data.targetUserId,
    );
    reply.code(201);
    return { conversation: conversation as unknown as CreateConversationResponse['conversation'] };
  });

  app.get('/conversations', async (request): Promise<ListConversationsResponse> => {
    const conversations = await messagesService.listConversations(request.userId);
    return { conversations: conversations as unknown as ListConversationsResponse['conversations'] };
  });

  app.get('/conversations/:id/messages', async (request): Promise<ListMessagesResponse> => {
    const { id } = request.params as { id: string };
    const messages = await messagesService.listMessages(id, request.userId);
    return { messages: messages as unknown as ListMessagesResponse['messages'] };
  });

  app.post('/conversations/:id/messages', async (request, reply): Promise<SendMessageResponse> => {
    const { id } = request.params as { id: string };
    const parsed = sendSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const message = await messagesService.sendMessage(id, request.userId, parsed.data.text);
    reply.code(201);
    return { message: message as unknown as SendMessageResponse['message'] };
  });
}
