import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ReelsScreen from '@/app/(tabs)/reels';
import { reelsService } from '@/services/reelsService';
import { useVideoPlayer } from 'expo-video';

jest.mock('@/services/reelsService');
jest.mock('@/services/contentService', () => ({
  contentService: { getById: jest.fn().mockResolvedValue(null) },
}));
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ earn: jest.fn() }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-me' } }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ type: 'wifi', isConnected: true, isInternetReachable: true }),
}));
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), loop: false, muted: false })),
    VideoView: (props: any) => React.createElement(View, props),
  };
});

describe('Reels preloads only the active + windowed neighbours on wifi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reelsService.getReels as jest.Mock).mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        user: { id: 'u1', username: 'tester', avatarUrl: null, tier: 'explorer' },
        text: `reel ${i}`,
        media: [{
          originalUrl: `https://cdn/o${i}.mov`,
          hlsManifestUrl: `https://cdn/h${i}.m3u8`,
        }],
        likeCount: 0,
        commentCount: 0,
      })),
    });
  });

  it('with activeIndex=0 on wifi, only 4 ReelItems get a non-null source (0,1,2,3)', async () => {
    render(<ReelsScreen />);

    await waitFor(() => {
      expect(useVideoPlayer).toHaveBeenCalled();
    });

    const calls = (useVideoPlayer as jest.Mock).mock.calls;
    const sourcedCalls = calls.filter((c) => c[0] !== null && c[0] !== undefined);
    const sourceUris = sourcedCalls.map((c) => c[0].uri);

    expect(sourceUris).toEqual(expect.arrayContaining([
      'https://cdn/h0.m3u8',
      'https://cdn/h1.m3u8',
      'https://cdn/h2.m3u8',
      'https://cdn/h3.m3u8',
    ]));
    expect(sourceUris).not.toEqual(expect.arrayContaining(['https://cdn/h4.m3u8']));
    expect(sourceUris).not.toEqual(expect.arrayContaining(['https://cdn/h9.m3u8']));
  });
});
