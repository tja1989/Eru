import api from './api';

export const reelsService = {
  getReels: (tab = 'foryou', page = 1) =>
    api.get('/reels', { params: { tab, page } }).then((r) => r.data),
  like: (id: string) => api.post(`/reels/${id}/like`).then((r) => r.data),
  comment: (id: string, text: string) =>
    api.post(`/reels/${id}/comments`, { text }).then((r) => r.data),
};
