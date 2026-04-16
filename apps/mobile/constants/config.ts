export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const config = {
  apiUrl: API_URL,
  apiPrefix: '/api/v1',
  pointsPollingInterval: 10000,
  notifPollingInterval: 30000,
  leaderboardPollingInterval: 30000,
  reelPreloadCount: 2,
  feedPageSize: 20,
  maxMediaPerPost: 10,
  maxVideoSeconds: 300,
  maxReelSeconds: 60,
} as const;
