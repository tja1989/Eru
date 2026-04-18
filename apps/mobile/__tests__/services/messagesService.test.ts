import { messagesService } from '@/services/messagesService';
import api from '@/services/api';

describe('messagesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createConversation()', () => {
    it('calls POST /conversations with targetUserId', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: { conversation: { id: 'c1' } },
      });
      const result = await messagesService.createConversation('u2');
      expect(api.post).toHaveBeenCalledWith('/conversations', { targetUserId: 'u2' });
      expect(result).toEqual({ id: 'c1' });
    });
  });

  describe('listConversations()', () => {
    it('calls GET /conversations and returns conversations array', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: { conversations: [{ id: 'c1' }] },
      });
      const result = await messagesService.listConversations();
      expect(api.get).toHaveBeenCalledWith('/conversations');
      expect(result).toEqual([{ id: 'c1' }]);
    });
  });

  describe('listMessages()', () => {
    it('calls GET /conversations/:id/messages', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: { messages: [{ id: 'm1', text: 'hi' }] },
      });
      const result = await messagesService.listMessages('c1');
      expect(api.get).toHaveBeenCalledWith('/conversations/c1/messages');
      expect(result).toEqual([{ id: 'm1', text: 'hi' }]);
    });
  });

  describe('send()', () => {
    it('calls POST /conversations/:id/messages with text', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: { message: { id: 'm1', text: 'hello', senderId: 'u1', createdAt: 'z' } },
      });
      const result = await messagesService.send('c1', 'hello');
      expect(api.post).toHaveBeenCalledWith('/conversations/c1/messages', { text: 'hello' });
      expect(result.text).toBe('hello');
    });
  });
});
