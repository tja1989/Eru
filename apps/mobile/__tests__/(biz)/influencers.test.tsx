/**
 * Influencers screen — top creators in the business pincode. Delegates to
 * the existing leaderboardService (mobile-side wrapper of the API's
 * creatorScoreService).
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/services/leaderboardService', () => ({
  leaderboardService: { getLeaderboard: jest.fn() },
}));

jest.mock('@/services/bizService', () => ({
  bizService: { getMe: jest.fn() },
}));

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff', card: '#fff', g100: '#eee', g200: '#ddd', g400: '#888',
    g500: '#777', g600: '#555', g700: '#333', g800: '#222', orange: '#f60',
    navy: '#123', green: '#0a0', red: '#a00', blue: '#00f',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

import { leaderboardService } from '@/services/leaderboardService';
import { bizService } from '@/services/bizService';
import BizInfluencers from '@/app/(biz)/influencers';

const mockedBoard = leaderboardService.getLeaderboard as jest.MockedFunction<typeof leaderboardService.getLeaderboard>;
const mockedMe = bizService.getMe as jest.MockedFunction<typeof bizService.getMe>;

describe('(biz)/influencers', () => {
  beforeEach(() => {
    mockedBoard.mockReset();
    mockedMe.mockReset();
  });

  it('renders top creators returned from the leaderboard service', async () => {
    mockedMe.mockResolvedValueOnce({
      business: {
        id: 'biz-1', name: 'Test', category: 'cafe', pincode: '682016',
        address: null, phone: null, avatarUrl: null, bannerUrl: null,
        isVerified: false, targetPincodes: [], followerCount: 0, rating: 0,
        reviewCount: 0, createdAt: new Date().toISOString(),
      },
    });
    mockedBoard.mockResolvedValueOnce({
      entries: [
        { id: 'u1', username: 'alice', name: 'Alice', avatarUrl: null, tier: 'creator', creatorScore: 87, points: 1200 },
        { id: 'u2', username: 'bob', name: 'Bob', avatarUrl: null, tier: 'explorer', creatorScore: 73, points: 950 },
      ],
    } as any);

    const { findByText } = render(<BizInfluencers />);
    expect(await findByText('alice')).toBeTruthy();
    expect(await findByText('bob')).toBeTruthy();
  });
});
