/**
 * AdPreview — thin adapter that maps a BizCampaign draft into the Post
 * shape PostCard renders, so the Review step in the Create-Ad wizard
 * shows the ad exactly as it will appear in the consumer feed.
 *
 * Strategy: mock PostCard, then assert the props AdPreview passes match
 * what the campaign draft would translate to.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/components/PostCard', () => ({
  PostCard: jest.fn(() => null),
}));

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff', card: '#fff', g100: '#eee', g400: '#888', g500: '#777',
    g600: '#555', g700: '#333', g800: '#222', orange: '#f60', navy: '#123',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

import { PostCard } from '@/components/PostCard';
import { AdPreview } from '@/components/biz/AdPreview';

const mockedPostCard = PostCard as unknown as jest.Mock;

describe('AdPreview', () => {
  beforeEach(() => {
    mockedPostCard.mockClear();
  });

  it('passes a synthetic post built from the campaign draft to PostCard', () => {
    render(
      <AdPreview
        draft={{
          type: 'promotion',
          title: 'Diwali Drive',
          body: '20% off everything',
          imageUrl: 'https://example.com/diwali.jpg',
        }}
        business={{ name: 'Test Cafe', avatarUrl: null }}
      />,
    );

    expect(mockedPostCard).toHaveBeenCalledTimes(1);
    const call = mockedPostCard.mock.calls[0];
    const props = call[0];

    // Sponsored marker so the consumer feed renders the SponsoredCtaBar.
    expect(props.post.isSponsored).toBe(true);
    // Headline + body combine into the text payload.
    expect(props.post.text).toContain('Diwali Drive');
    expect(props.post.text).toContain('20% off everything');
    // Media URL surfaces in the post.
    expect(props.post.mediaUrl ?? props.post.media?.[0]?.url ?? '').toBe('https://example.com/diwali.jpg');
    // Author derived from the business.
    expect(props.post.user?.name ?? props.post.author?.name ?? props.post.username).toBeDefined();
  });

  it('handles a draft with no body or image (title-only campaign)', () => {
    render(
      <AdPreview
        draft={{ type: 'brand_awareness', title: 'Just a name', body: '', imageUrl: '' }}
        business={{ name: 'Test Cafe', avatarUrl: null }}
      />,
    );
    expect(mockedPostCard).toHaveBeenCalledTimes(1);
    const props = mockedPostCard.mock.calls[0][0];
    expect(props.post.text).toBe('Just a name');
    expect(props.post.mediaUrl ?? props.post.media?.[0]?.url ?? null).toBeNull();
  });
});
