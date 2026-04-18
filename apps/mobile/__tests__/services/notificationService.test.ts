import { notificationService } from '@/services/notificationService';
import api from '@/services/api';

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('list()', () => {
    it('calls GET /notifications with page and limit', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: { notifications: [], page: 1, limit: 20, total: 0, unreadCount: 0 },
      });
      const result = await notificationService.list(1, 20);
      expect(api.get).toHaveBeenCalledWith('/notifications', { params: { page: 1, limit: 20 } });
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('markRead()', () => {
    it('calls PUT /notifications/read with an array of ids', async () => {
      (api.put as jest.Mock).mockResolvedValue({ data: { updated: 2 } });
      const result = await notificationService.markRead(['id1', 'id2']);
      expect(api.put).toHaveBeenCalledWith('/notifications/read', { ids: ['id1', 'id2'] });
      expect(result).toBe(2);
    });
  });
});
