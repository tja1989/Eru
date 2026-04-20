import { describe, it, expect } from 'vitest';
import { scoreContent, SUBTYPE_REACH_MULTIPLIER } from '../../src/services/feedAlgorithm.js';

describe('feedAlgorithm — subtype reach multiplier', () => {
  const ctx = {
    userId: 'user-a',
    pincode: '682001',
    interests: ['food'],
    followingIds: [],
  };

  const baseContent = {
    publishedAt: new Date(),
    createdAt: new Date(),
    likeCount: 10,
    commentCount: 2,
    shareCount: 1,
    hashtags: ['food'],
    locationPincode: '682001',
    userId: 'creator-a',
  };

  it('Review posts score 3x higher than Meme posts with otherwise identical signal', () => {
    const review = scoreContent({ ...baseContent, subtype: 'review' }, ctx);
    const meme = scoreContent({ ...baseContent, subtype: 'meme' }, ctx);
    expect(review).toBeCloseTo(meme * 3.0, 4);
  });

  it('Local Guide posts score 2x higher than Meme posts', () => {
    const lg = scoreContent({ ...baseContent, subtype: 'local_guide' }, ctx);
    const meme = scoreContent({ ...baseContent, subtype: 'meme' }, ctx);
    expect(lg).toBeCloseTo(meme * 2.0, 4);
  });

  it('Null subtype falls back to 1.0 multiplier (same as Meme)', () => {
    const nullSub = scoreContent({ ...baseContent, subtype: null }, ctx);
    const meme = scoreContent({ ...baseContent, subtype: 'meme' }, ctx);
    expect(nullSub).toBeCloseTo(meme, 4);
  });

  it('Unknown subtype string falls back to 1.0 multiplier', () => {
    const weird = scoreContent({ ...baseContent, subtype: 'totally_unknown' }, ctx);
    const meme = scoreContent({ ...baseContent, subtype: 'meme' }, ctx);
    expect(weird).toBeCloseTo(meme, 4);
  });

  it('Multiplier table has an entry for every subtype referenced', () => {
    const expected = [
      'review', 'recommendation', 'vlog', 'photo_story', 'tutorial',
      'comparison', 'unboxing', 'event_coverage', 'hot_take', 'meme',
      'recipe', 'local_guide',
    ];
    for (const key of expected) {
      expect(SUBTYPE_REACH_MULTIPLIER[key]).toBeGreaterThan(0);
    }
    expect(SUBTYPE_REACH_MULTIPLIER.review).toBe(3.0);
    expect(SUBTYPE_REACH_MULTIPLIER.local_guide).toBe(2.0);
  });
});
