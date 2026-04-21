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
    (contentService.save as jest.Mock).mockResolvedValue({});
    (contentService.unsave as jest.Mock).mockResolvedValue({});
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

describe('<PostCard /> save button', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.save as jest.Mock).mockResolvedValue({});
    (contentService.unsave as jest.Mock).mockResolvedValue({});
    (contentService.like as jest.Mock).mockResolvedValue({});
    (contentService.unlike as jest.Mock).mockResolvedValue({});
    (contentService.dislike as jest.Mock).mockResolvedValue({});
    (contentService.undislike as jest.Mock).mockResolvedValue({});
  });

  it('renders 🔖 with accessibilityLabel "Save post"', () => {
    const { getByLabelText, getByText } = render(<PostCard post={{ ...basePost, isSaved: false }} />);
    expect(getByLabelText('Save post')).toBeTruthy();
    expect(getByText('🔖')).toBeTruthy();
  });

  it('is not selected when post.isSaved is false', () => {
    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: false }} />);
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(false);
  });

  it('is selected when post.isSaved is true', () => {
    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: true }} />);
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(true);
  });

  it('optimistically flips to saved on tap before promise resolves', async () => {
    let resolveSave!: () => void;
    (contentService.save as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveSave = res; }),
    );

    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: false }} />);

    fireEvent.press(getByLabelText('Save post'));

    // Must flip immediately — before we resolve the promise
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(true);

    await act(async () => { resolveSave(); });
  });

  it('optimistically flips back to unsaved when tap unsaves', async () => {
    let resolveUnsave!: () => void;
    (contentService.unsave as jest.Mock).mockReturnValue(
      new Promise<void>((res) => { resolveUnsave = res; }),
    );

    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: true }} />);

    // Initially selected (saved)
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(true);

    fireEvent.press(getByLabelText('Save post'));

    // Flips back immediately — deselected
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(false);

    await act(async () => { resolveUnsave(); });
  });

  it('rolls back optimistic flip when save() throws a non-409 error', async () => {
    (contentService.save as jest.Mock).mockRejectedValue(new Error('network error'));

    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: false }} />);

    fireEvent.press(getByLabelText('Save post'));
    // Optimistic flip — selected immediately
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(true);

    // Wait for rollback after rejected promise
    await waitFor(() => {
      expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(false);
    });
  });

  it('does NOT roll back when save() rejects with 409 (already saved = success)', async () => {
    const err409 = { response: { status: 409 } };
    (contentService.save as jest.Mock).mockRejectedValue(err409);

    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: false }} />);

    fireEvent.press(getByLabelText('Save post'));
    // Stays selected after 409
    await waitFor(() => {
      expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(true);
    });
  });

  it('rolls back when unsave() throws a non-409 error', async () => {
    (contentService.unsave as jest.Mock).mockRejectedValue(new Error('network error'));

    const { getByLabelText } = render(<PostCard post={{ ...basePost, isSaved: true }} />);

    // Tap to unsave
    fireEvent.press(getByLabelText('Save post'));
    // Optimistic flip — deselected immediately
    expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(false);

    // Wait for rollback — should go back to saved (true)
    await waitFor(() => {
      expect(getByLabelText('Save post').props.accessibilityState?.selected).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// <PostCard /> variant rendering — PWA parity for the 6 post types that live
// on the home feed. Each test seeds only the derived fields that variant
// needs; defaults from variantBase cover everything else.
// ---------------------------------------------------------------------------

const variantBase = {
  id: 'p1',
  type: 'post',
  text: 'Monsoon mornings in Munnar hit different.',
  media: [{ id: 'm1', type: 'image', originalUrl: 'x', thumbnailUrl: 'x', sortOrder: 0 }],
  isLiked: false,
  isDisliked: false,
  isSaved: false,
  likeCount: 5124,
  commentCount: 342,
  user: {
    id: 'u1',
    username: 'KeralaDiaries',
    name: 'Kerala Diaries',
    avatarUrl: null,
    tier: 'influencer',
    isVerified: true,
  },
  // P6 derived fields
  ugcBadge: 'creator' as const,
  moderationBadge: null,
  isSponsored: false,
  sponsorName: null,
  sponsorAvatarUrl: null,
  sponsorBusinessId: null,
  offerUrl: null,
  pointsEarnedOnView: 8,
  locationLabel: 'Munnar, Kerala',
  mediaKind: 'photo' as const,
  carouselCount: null,
  durationSeconds: null,
  createdAt: new Date(Date.now() - 32 * 60_000).toISOString(),
};

describe('<PostCard /> variants (PWA parity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.like as jest.Mock).mockResolvedValue({});
    (contentService.unlike as jest.Mock).mockResolvedValue({});
    (contentService.save as jest.Mock).mockResolvedValue({});
    (contentService.unsave as jest.Mock).mockResolvedValue({});
    (contentService.dislike as jest.Mock).mockResolvedValue({});
    (contentService.undislike as jest.Mock).mockResolvedValue({});
  });

  it('V1 creator photo: ✓ CREATOR + location + +8 pts + 5,124 likes + 342 comments + 32m', () => {
    const { getByText } = render(<PostCard post={variantBase} />);
    expect(getByText('✓ CREATOR')).toBeTruthy();
    expect(getByText('Munnar, Kerala')).toBeTruthy();
    expect(getByText(/🪙 \+8/)).toBeTruthy();
    expect(getByText(/5,124 likes/i)).toBeTruthy();
    expect(getByText(/View all 342 comments/i)).toBeTruthy();
    expect(getByText('32m')).toBeTruthy();
  });

  it('V2 creator video: play button + duration 4:32', () => {
    const video = {
      ...variantBase,
      mediaKind: 'video' as const,
      media: [{ id: 'm1', type: 'video', originalUrl: 'v', thumbnailUrl: 'x', sortOrder: 0, durationSeconds: 272 }],
      durationSeconds: 272,
    };
    const { getByLabelText, getByText } = render(<PostCard post={video} />);
    expect(getByLabelText('play')).toBeTruthy();
    expect(getByText('4:32')).toBeTruthy();
  });

  it('V3 sponsored: • Sponsored label + distance line + Claim Offer CTA', () => {
    const sponsored = {
      ...variantBase,
      ugcBadge: null,
      isSponsored: true,
      sponsorName: 'Kashi Bakes',
      sponsorBusinessId: 'b1',
      offerUrl: '/business/b1',
      locationLabel: '682016 • 0.8 km',
      pointsEarnedOnView: 15,
    };
    const { getByText, getByRole } = render(<PostCard post={sponsored} />);
    expect(getByText(/Kashi Bakes/)).toBeTruthy();
    expect(getByText(/• Sponsored/)).toBeTruthy();
    expect(getByText(/0\.8 km/)).toBeTruthy();
    expect(getByText(/🪙 \+15/)).toBeTruthy();
    expect(getByRole('button', { name: /Claim Offer/i })).toBeTruthy();
  });

  it('V4 UGC carousel: ✓ USER CREATED + ✓ APPROVED + 3 dots', () => {
    const ugc = {
      ...variantBase,
      ugcBadge: 'user_created' as const,
      moderationBadge: 'approved' as const,
      user: { ...variantBase.user, isVerified: false },
      mediaKind: 'carousel' as const,
      carouselCount: 3,
      media: [
        { id: 'm1', type: 'image', originalUrl: 'x', thumbnailUrl: 'x', sortOrder: 0 },
        { id: 'm2', type: 'image', originalUrl: 'x', thumbnailUrl: 'x', sortOrder: 1 },
        { id: 'm3', type: 'image', originalUrl: 'x', thumbnailUrl: 'x', sortOrder: 2 },
      ],
    };
    const { getByText, getByLabelText, getAllByLabelText } = render(<PostCard post={ugc} />);
    expect(getByText('✓ USER CREATED')).toBeTruthy();
    expect(getByText('✓ APPROVED')).toBeTruthy();
    expect(getByLabelText('carousel indicator')).toBeTruthy();
    expect(getAllByLabelText(/carousel dot/)).toHaveLength(3);
  });

  it('V5 poll: renders pollOptions via PollCard', () => {
    const poll = {
      ...variantBase,
      type: 'poll',
      mediaKind: 'poll' as const,
      pollOptions: [
        { id: 'a', text: 'Sharjah Shake at Beach', voteCount: 1764 },
        { id: 'b', text: 'Pazhampori from bakery', voteCount: 1302 },
      ],
      userVote: null,
    };
    const { getByText } = render(<PostCard post={poll} />);
    expect(getByText(/Sharjah Shake at Beach/)).toBeTruthy();
  });

  it('V6 reel: ▶ Reel • 0:45 badge', () => {
    const reel = {
      ...variantBase,
      type: 'reel',
      mediaKind: 'reel' as const,
      media: [{ id: 'm1', type: 'video', originalUrl: 'v', thumbnailUrl: 'x', sortOrder: 0, durationSeconds: 45 }],
      durationSeconds: 45,
    };
    const { getByText } = render(<PostCard post={reel} />);
    expect(getByText('▶ Reel • 0:45')).toBeTruthy();
  });
});
