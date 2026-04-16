import api from './api';

export const leaderboardService = {
  getLeaderboard: (scope = 'pincode', pincode?: string) =>
    api.get('/leaderboard', { params: { scope, pincode } }).then((r) => r.data),
  getMyRank: () => api.get('/leaderboard/me').then((r) => r.data),
  getCurrentSeason: () => api.get('/season/current').then((r) => r.data),
  getWeeklyQuests: () => api.get('/quests/weekly').then((r) => r.data),
};
