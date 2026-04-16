import api from './api';

export const notificationService = {
  getNotifications: (page = 1) => api.get('/notifications', { params: { page } }).then((r) => r.data),
  markRead: (ids: string[]) => api.put('/notifications/read', { ids }).then((r) => r.data),
};
