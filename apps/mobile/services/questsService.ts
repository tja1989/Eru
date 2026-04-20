import api from '@/services/api';
import type { WeeklyQuest } from '@eru/shared';

export const questsService = {
  getWeekly: (): Promise<WeeklyQuest[]> =>
    api.get('/quests/weekly').then((r) => r.data.quests),
};
