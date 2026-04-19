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
jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn(), loop: false, muted: false })),
    VideoView: (props: any) => React.createElement(View, props),
  };
});

describe('Reels feed picks higher-quality variant via pickVideoUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reelsService.getReels as jest.Mock).mockResolvedValue({
      data: [{
        id: 'r1',
        user: { id: 'u1', username: 'tester', avatarUrl: null, tier: 'explorer', isFollowing: false },
        text: 'hello',
        media: [{
          originalUrl: 'https://cdn/original.mov',
          video720pUrl: 'https://cdn/720.mp4',
          thumbnailUrl: null,
        }],
        likeCount: 0,
        commentCount: 0,
      }],
    });
  });

  it('passes the 720p URL (not the originalUrl) to useVideoPlayer', async () => {
    render(<ReelsScreen />);
    await waitFor(() => {
      expect(useVideoPlayer).toHaveBeenCalledWith({ uri: 'https://cdn/720.mp4' }, expect.any(Function));
    });
    expect(useVideoPlayer).not.toHaveBeenCalledWith({ uri: 'https://cdn/original.mov' }, expect.any(Function));
  });
});
