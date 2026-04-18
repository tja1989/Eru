import api from '@/services/api';

export const questsService = {
  getWeekly: () => api.get('/quests/weekly').then((r) => r.data.quests),
};
