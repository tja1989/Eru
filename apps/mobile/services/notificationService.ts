import api from './api';

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  deepLink: string | null;
  isRead: boolean;
  createdAt: string;
};

export const notificationService = {
  async list(page = 1, limit = 20) {
    const res = await api.get('/notifications', { params: { page, limit } });
    return res.data as {
      notifications: Notification[];
      page: number;
      limit: number;
      total: number;
      unreadCount: number;
    };
  },

  async markRead(ids: string[]) {
    const res = await api.put('/notifications/read', { ids });
    return res.data.updated as number;
  },
};
