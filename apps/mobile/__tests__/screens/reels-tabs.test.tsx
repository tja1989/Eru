import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ReelsScreen from '@/app/(tabs)/reels';
import { reelsService } from '@/services/reelsService';

jest.mock('@/services/reelsService');
jest.mock('@/services/contentService', () => ({
  contentService: { getById: jest.fn().mockResolvedValue(null) },
}));
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ earn: jest.fn() }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u1' } }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn(), loop: false, muted: false }),
  VideoView: () => null,
}));

describe('<ReelsScreen /> tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reelsService.getReels as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('defaults to "For You" tab and calls reelsService with foryou', async () => {
    render(<ReelsScreen />);
    await waitFor(() => {
      expect(reelsService.getReels).toHaveBeenCalledWith('foryou', 1);
    });
  });

  it('switches to "Following" when tab pressed', async () => {
    const { findByText, getByText } = render(<ReelsScreen />);
    await findByText(/for you/i);
    fireEvent.press(getByText(/following/i));
    await waitFor(() => {
      expect(reelsService.getReels).toHaveBeenLastCalledWith('following', 1);
    });
  });

  it('switches to "Local" when tab pressed', async () => {
    const { findByText, getByText } = render(<ReelsScreen />);
    await findByText(/for you/i);
    fireEvent.press(getByText(/local/i));
    await waitFor(() => {
      expect(reelsService.getReels).toHaveBeenLastCalledWith('local', 1);
    });
  });
});
