import api from './api';

export const userService = {
  getProfile: (id: string) => api.get(`/users/${id}/profile`).then((r) => r.data),
  follow: (id: string) => api.post(`/users/${id}/follow`).then((r) => r.data),
  unfollow: (id: string) => api.delete(`/users/${id}/unfollow`).then((r) => r.data),
  getContent: (id: string, tab = 'posts', page = 1) =>
    api.get(`/users/${id}/content`, { params: { tab, page } }).then((r) => r.data),
  getFollowers: (id: string, page = 1) => api.get(`/users/${id}/followers`, { params: { page } }).then((r) => r.data),
  getFollowing: (id: string, page = 1) => api.get(`/users/${id}/following`, { params: { page } }).then((r) => r.data),
  getSettings: () => api.get('/users/me/settings').then((r) => r.data),
  updateSettings: (data: Record<string, any>) => api.put('/users/me/settings', data).then((r) => r.data),
};
