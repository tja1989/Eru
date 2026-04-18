import api from '@/services/api';

export const spinService = {
  status: () => api.get('/spin/status').then((r) => r.data),
  spin: () => api.post('/spin').then((r) => r.data),
};
