import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';
import { emitToUser } from '../ws/gateway.js';

function orderedPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

export const messagesService = {
  async getOrCreateConversation(userIdA: string, userIdB: string) {
    if (userIdA === userIdB) throw Errors.badRequest('Cannot DM yourself');
    const [userAId, userBId] = orderedPair(userIdA, userIdB);
    const existing = await prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });
    if (existing) return existing;
    return prisma.conversation.create({ data: { userAId, userBId } });
  },

  async sendMessage(conversationId: string, senderId: string, text: string) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw Errors.notFound('Conversation');
    if (conv.userAId !== senderId && conv.userBId !== senderId) throw Errors.forbidden();

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: { conversationId, senderId, text },
        include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Push the message to the recipient's websocket room so their chat
    // view appends it immediately. Also echo back to the sender so their
    // other open clients (web + mobile) stay in sync.
    const recipientId = conv.userAId === senderId ? conv.userBId : conv.userAId;
    const payload = { conversationId, message };
    try {
      emitToUser(recipientId, 'message:new', payload);
      emitToUser(senderId, 'message:new', payload);
    } catch {
      // Gateway isn't available in tests; ignore.
    }

    return message;
  },

  async listConversations(userId: string) {
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        userA: { select: { id: true, username: true, avatarUrl: true } },
        userB: { select: { id: true, username: true, avatarUrl: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    return convs.map((c) => ({
      id: c.id,
      otherUser: c.userAId === userId ? c.userB : c.userA,
      lastMessage: c.messages[0] ?? null,
      lastMessageAt: c.lastMessageAt,
    }));
  },

  async listMessages(conversationId: string, userId: string) {
    const conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw Errors.notFound('Conversation');
    if (conv.userAId !== userId && conv.userBId !== userId) throw Errors.forbidden();
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });
  },
};
