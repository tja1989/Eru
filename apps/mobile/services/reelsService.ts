import api from './api';
import type { PaginatedResponse } from '@eru/shared';

export const reelsService = {
  getReels: <T = unknown>(
    tab = 'foryou',
    page = 1,
  ): Promise<PaginatedResponse<T>> =>
    api.get('/reels', { params: { tab, page } }).then((r) => r.data),
  like: (id: string) => api.post(`/reels/${id}/like`).then((r) => r.data),
  comment: (id: string, text: string) =>
    api.post(`/reels/${id}/comments`, { text }).then((r) => r.data),
};
