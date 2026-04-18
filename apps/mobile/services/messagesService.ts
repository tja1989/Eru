import api from '@/services/api';

export type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  readAt?: string | null;
  sender?: { id: string; username: string; avatarUrl: string | null };
};

export type ConversationSummary = {
  id: string;
  otherUser: { id: string; username: string; avatarUrl: string | null } | null;
  lastMessage: Message | null;
  lastMessageAt: string | null;
};

export const messagesService = {
  async createConversation(targetUserId: string) {
    const res = await api.post('/conversations', { targetUserId });
    return res.data.conversation;
  },
  async listConversations(): Promise<ConversationSummary[]> {
    const res = await api.get('/conversations');
    return res.data.conversations;
  },
  async listMessages(conversationId: string): Promise<Message[]> {
    const res = await api.get(`/conversations/${conversationId}/messages`);
    return res.data.messages;
  },
  async send(conversationId: string, text: string): Promise<Message> {
    const res = await api.post(`/conversations/${conversationId}/messages`, { text });
    return res.data.message;
  },
};
