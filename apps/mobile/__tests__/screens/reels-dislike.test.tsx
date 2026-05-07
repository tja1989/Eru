import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ReelsScreen from '@/app/(tabs)/reels';
import { reelsService } from '@/services/reelsService';
import { contentService } from '@/services/contentService';

jest.mock('@/services/reelsService');
jest.mock('@/services/contentService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ earn: jest.fn() }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-me' } }),
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({
    play: jest.fn(),
    pause: jest.fn(),
    loop: false,
    muted: false,
    addListener: () => () => {},
  }),
  VideoView: () => null,
}));

const mockReel = {
  id: 'reel-1',
  type: 'reel',
  text: 'Test reel',
  media: [{ originalUrl: 'http://video.mp4', thumbnailUrl: null }],
  isLiked: false,
  isDisliked: false,
  likeCount: 5,
  commentCount: 1,
  user: { id: 'u-other', username: 'bob', avatarUrl: null, isFollowing: false },
};

describe('<ReelItem /> dislike button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reelsService.getReels as jest.Mock).mockResolvedValue({ data: [mockReel] });
    (contentService.dislike as jest.Mock).mockResolvedValue({});
    (contentService.undislike as jest.Mock).mockResolvedValue({});
  });

  it('renders the "Not for me" dislike button', async () => {
    const { findByLabelText } = render(<ReelsScreen />);
    expect(await findByLabelText('Not for me')).toBeTruthy();
  });

  it('has accessibilityLabel "Not for me"', async () => {
    const { findByLabelText } = render(<ReelsScreen />);
    expect(await findByLabelText('Not for me')).toBeTruthy();
  });

  it('optimistically flips to disliked immediately on tap', async () => {
    let resolveDislike!: () => void;
    (contentService.dislike as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveDislike = res; }),
    );

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Not for me');

    // Before tap: not selected
    expect(btn.props.accessibilityState?.selected).toBe(false);

    fireEvent.press(btn);

    // Flips optimistically — before promise resolves
    expect(btn.props.accessibilityState?.selected).toBe(true);

    await act(async () => { resolveDislike(); });
  });

  it('optimistically flips back to un-disliked immediately when undisliking', async () => {
    // Mock reel that starts already disliked
    (reelsService.getReels as jest.Mock).mockResolvedValue({
      data: [{ ...mockReel, isDisliked: true }],
    });

    let resolveUndislike!: () => void;
    (contentService.undislike as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveUndislike = res; }),
    );

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Not for me');

    // Initially selected (disliked)
    expect(btn.props.accessibilityState?.selected).toBe(true);

    fireEvent.press(btn);

    // Flips back immediately — deselected before promise resolves
    expect(btn.props.accessibilityState?.selected).toBe(false);

    await act(async () => { resolveUndislike(); });
  });

  it('rolls back optimistic flip when dislike() throws a non-409 error', async () => {
    (contentService.dislike as jest.Mock).mockRejectedValue(new Error('network'));

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Not for me');

    fireEvent.press(btn);
    expect(btn.props.accessibilityState?.selected).toBe(true);

    await waitFor(() => {
      expect(btn.props.accessibilityState?.selected).toBe(false);
    });
  });

  it('does NOT roll back on 409 (already disliked = treat as success)', async () => {
    const err409 = { response: { status: 409 } };
    (contentService.dislike as jest.Mock).mockRejectedValue(err409);

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Not for me');

    fireEvent.press(btn);

    await waitFor(() => {
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });
  });
});
