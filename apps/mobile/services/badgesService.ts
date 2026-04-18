import api from '@/services/api';

export type Badge = {
  id: string;
  code: string;
  title: string;
  description: string;
  emoji: string;
  unlockedAt: string | null;
};

export const badgesService = {
  list: () => api.get('/badges').then((r) => r.data.badges as Badge[]),
  check: () => api.post('/badges/check').then((r) => r.data),
};
