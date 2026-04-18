import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { PostCard } from '@/components/PostCard';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ earn: jest.fn() }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-me' } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('expo-video', () => ({
  useVideoPlayer: () => ({ play: jest.fn(), pause: jest.fn(), loop: false, muted: false }),
  VideoView: () => null,
}));

const basePost = {
  id: 'post-1',
  type: 'post',
  text: 'Test post',
  media: [],
  isLiked: false,
  isDisliked: false,
  isSaved: false,
  likeCount: 10,
  commentCount: 2,
  user: { id: 'u-other', username: 'alice', avatarUrl: null, tier: 'explorer', isVerified: false },
};

describe('<PostCard /> dislike button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.dislike as jest.Mock).mockResolvedValue({});
    (contentService.undislike as jest.Mock).mockResolvedValue({});
    (contentService.like as jest.Mock).mockResolvedValue({});
    (contentService.unlike as jest.Mock).mockResolvedValue({});
  });

  it('renders 👎 when post is not disliked', () => {
    const { getByLabelText } = render(<PostCard post={{ ...basePost, isDisliked: false }} />);
    const btn = getByLabelText('Not for me');
    expect(btn).toBeTruthy();
  });

  it('has accessibilityLabel "Not for me"', () => {
    const { getByLabelText } = render(<PostCard post={basePost} />);
    expect(getByLabelText('Not for me')).toBeTruthy();
  });

  it('shows 👎 when not disliked and active state when disliked', () => {
    const { getByLabelText, getByText } = render(<PostCard post={{ ...basePost, isDisliked: false }} />);
    expect(getByLabelText('Not for me')).toBeTruthy();
    // Always renders the plain emoji
    expect(getByText('👎')).toBeTruthy();
    // Not selected when not disliked
    expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(false);
  });

  it('optimistically flips to disliked immediately on tap (before promise resolves)', async () => {
    let resolveDislike!: () => void;
    (contentService.dislike as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveDislike = res; }),
    );

    const { getByLabelText, getByText } = render(
      <PostCard post={{ ...basePost, isDisliked: false }} />,
    );

    fireEvent.press(getByLabelText('Not for me'));

    // State must flip immediately — before we resolve the promise
    // Emoji stays '👎' but button is now selected
    expect(getByText('👎')).toBeTruthy();
    expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(true);

    // Cleanup: resolve promise so no hanging promises exist
    await act(async () => { resolveDislike(); });
  });

  it('optimistically flips back to un-disliked immediately when undisliking', async () => {
    let resolveUndislike!: () => void;
    (contentService.undislike as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveUndislike = res; }),
    );

    const { getByLabelText, getByText } = render(
      <PostCard post={{ ...basePost, isDisliked: true }} />,
    );

    // Initially selected (disliked)
    expect(getByText('👎')).toBeTruthy();
    expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(true);

    fireEvent.press(getByLabelText('Not for me'));

    // Flips back immediately — deselected
    expect(getByText('👎')).toBeTruthy();
    expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(false);

    await act(async () => { resolveUndislike(); });
  });

  it('rolls back optimistic flip when dislike() throws a non-409 error', async () => {
    (contentService.dislike as jest.Mock).mockRejectedValue(new Error('network error'));

    const { getByLabelText } = render(
      <PostCard post={{ ...basePost, isDisliked: false }} />,
    );

    fireEvent.press(getByLabelText('Not for me'));
    // Optimistic flip — selected immediately
    expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(true);

    // Wait for rollback after rejected promise
    await waitFor(() => {
      expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(false);
    });
  });

  it('does NOT roll back when dislike() rejects with 409 (already disliked = success)', async () => {
    const err409 = { response: { status: 409 } };
    (contentService.dislike as jest.Mock).mockRejectedValue(err409);

    const { getByLabelText } = render(
      <PostCard post={{ ...basePost, isDisliked: false }} />,
    );

    fireEvent.press(getByLabelText('Not for me'));
    // Stays selected after 409
    await waitFor(() => {
      expect(getByLabelText('Not for me').props.accessibilityState?.selected).toBe(true);
    });
  });
});
