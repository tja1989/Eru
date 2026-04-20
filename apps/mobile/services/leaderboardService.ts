import api from './api';
import type {
  LeaderboardResponse,
  MyRankResponse,
  SeasonResponse,
  WeeklyQuestsResponse,
} from '@eru/shared';

export const leaderboardService = {
  getLeaderboard: (scope = 'pincode', pincode?: string): Promise<LeaderboardResponse> =>
    api.get('/leaderboard', { params: { scope, pincode } }).then((r) => r.data),
  getMyRank: (): Promise<MyRankResponse> =>
    api.get('/leaderboard/me').then((r) => r.data),
  getCurrentSeason: (): Promise<SeasonResponse> =>
    api.get('/season/current').then((r) => r.data),
  getWeeklyQuests: (): Promise<WeeklyQuestsResponse> =>
    api.get('/quests/weekly').then((r) => r.data),
};
