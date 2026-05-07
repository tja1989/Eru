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
  isSaved: false,
  likeCount: 5,
  commentCount: 1,
  user: { id: 'u-other', username: 'bob', avatarUrl: null, isFollowing: false },
};

describe('<ReelItem /> save button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (reelsService.getReels as jest.Mock).mockResolvedValue({ data: [mockReel] });
    (contentService.save as jest.Mock).mockResolvedValue({});
    (contentService.unsave as jest.Mock).mockResolvedValue({});
    (contentService.dislike as jest.Mock).mockResolvedValue({});
    (contentService.undislike as jest.Mock).mockResolvedValue({});
  });

  it('renders the save button with accessibilityLabel "Save post"', async () => {
    const { findByLabelText } = render(<ReelsScreen />);
    expect(await findByLabelText('Save post')).toBeTruthy();
  });

  it('is not selected when reel.isSaved is false', async () => {
    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');
    expect(btn.props.accessibilityState?.selected).toBe(false);
  });

  it('is selected when reel.isSaved is true', async () => {
    (reelsService.getReels as jest.Mock).mockResolvedValue({
      data: [{ ...mockReel, isSaved: true }],
    });
    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');
    expect(btn.props.accessibilityState?.selected).toBe(true);
  });

  it('optimistically flips to saved on tap before promise resolves', async () => {
    let resolveSave!: () => void;
    (contentService.save as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveSave = res; }),
    );

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');

    expect(btn.props.accessibilityState?.selected).toBe(false);

    fireEvent.press(btn);

    // Flips optimistically — before promise resolves
    expect(btn.props.accessibilityState?.selected).toBe(true);

    await act(async () => { resolveSave(); });
  });

  it('optimistically flips back to unsaved immediately when unsaving', async () => {
    (reelsService.getReels as jest.Mock).mockResolvedValue({
      data: [{ ...mockReel, isSaved: true }],
    });

    let resolveUnsave!: () => void;
    (contentService.unsave as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveUnsave = res; }),
    );

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');

    // Initially selected (saved)
    expect(btn.props.accessibilityState?.selected).toBe(true);

    fireEvent.press(btn);

    // Flips back immediately — deselected before promise resolves
    expect(btn.props.accessibilityState?.selected).toBe(false);

    await act(async () => { resolveUnsave(); });
  });

  it('rolls back optimistic flip when save() throws a non-409 error', async () => {
    (contentService.save as jest.Mock).mockRejectedValue(new Error('network'));

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');

    fireEvent.press(btn);
    expect(btn.props.accessibilityState?.selected).toBe(true);

    await waitFor(() => {
      expect(btn.props.accessibilityState?.selected).toBe(false);
    });
  });

  it('does NOT roll back on 409 (already saved = treat as success)', async () => {
    const err409 = { response: { status: 409 } };
    (contentService.save as jest.Mock).mockRejectedValue(err409);

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');

    fireEvent.press(btn);

    await waitFor(() => {
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });
  });

  it('rolls back when unsave() throws a non-409 error', async () => {
    (reelsService.getReels as jest.Mock).mockResolvedValue({
      data: [{ ...mockReel, isSaved: true }],
    });
    (contentService.unsave as jest.Mock).mockRejectedValue(new Error('network'));

    const { findByLabelText } = render(<ReelsScreen />);
    const btn = await findByLabelText('Save post');

    // Tap to unsave
    fireEvent.press(btn);
    // Optimistic flip — deselected immediately
    expect(btn.props.accessibilityState?.selected).toBe(false);

    // Wait for rollback — should go back to saved (true)
    await waitFor(() => {
      expect(btn.props.accessibilityState?.selected).toBe(true);
    });
  });
});
