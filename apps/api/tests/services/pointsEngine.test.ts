import { describe, it, expect } from 'vitest';
import { ACTION_CONFIGS, getMultiplier, getTierForPoints, DAILY_POINTS_GOAL, POINTS_EXPIRY_MONTHS } from '@eru/shared';

describe('Points Engine Constants', () => {
  it('has exactly 15 action types', () => {
    expect(Object.keys(ACTION_CONFIGS).length).toBe(15);
  });

  it('all actions have positive points and daily caps', () => {
    for (const [key, config] of Object.entries(ACTION_CONFIGS)) {
      expect(config.points, `${key} should have positive points`).toBeGreaterThan(0);
      expect(config.dailyCap, `${key} should have positive dailyCap`).toBeGreaterThan(0);
    }
  });

  it('content actions require contentId', () => {
    expect(ACTION_CONFIGS.read_article.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.watch_video.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.reel_watch.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.listen_podcast.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.read_thread.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.like.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.comment.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.share.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.save.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.create_content.requiresContentId).toBe(true);
    expect(ACTION_CONFIGS.content_trending.requiresContentId).toBe(true);
  });

  it('growth actions like daily_checkin do not require contentId', () => {
    expect(ACTION_CONFIGS.daily_checkin.requiresContentId).toBe(false);
    expect(ACTION_CONFIGS.refer_friend.requiresContentId).toBe(false);
    expect(ACTION_CONFIGS.complete_profile.requiresContentId).toBe(false);
    expect(ACTION_CONFIGS.follow.requiresContentId).toBe(false);
  });

  it('watch_video requires minWatchTimeSeconds of 60', () => {
    expect(ACTION_CONFIGS.watch_video.validation.minWatchTimeSeconds).toBe(60);
  });

  it('listen_podcast requires minWatchTimeSeconds of 120', () => {
    expect(ACTION_CONFIGS.listen_podcast.validation.minWatchTimeSeconds).toBe(120);
  });

  it('read_article requires minWatchTimeSeconds of 30 and minScrollDepth', () => {
    expect(ACTION_CONFIGS.read_article.validation.minWatchTimeSeconds).toBe(30);
    expect(ACTION_CONFIGS.read_article.validation.minScrollDepth).toBe(0.7);
  });

  it('comment requires minWordCount of 10', () => {
    expect(ACTION_CONFIGS.comment.validation.minWordCount).toBe(10);
  });

  it('daily_checkin awards 25 points with a cap of 1', () => {
    expect(ACTION_CONFIGS.daily_checkin.points).toBe(25);
    expect(ACTION_CONFIGS.daily_checkin.dailyCap).toBe(1);
  });

  it('content_trending awards 200 points', () => {
    expect(ACTION_CONFIGS.content_trending.points).toBe(200);
  });

  it('DAILY_POINTS_GOAL is 250', () => {
    expect(DAILY_POINTS_GOAL).toBe(250);
  });

  it('POINTS_EXPIRY_MONTHS is 6', () => {
    expect(POINTS_EXPIRY_MONTHS).toBe(6);
  });
});

describe('Tier System', () => {
  it('explorer gets 1.0x multiplier', () => {
    expect(getMultiplier('explorer')).toBe(1.0);
  });

  it('engager gets 1.2x multiplier', () => {
    expect(getMultiplier('engager')).toBe(1.2);
  });

  it('influencer gets 1.5x multiplier', () => {
    expect(getMultiplier('influencer')).toBe(1.5);
  });

  it('champion gets 2.0x multiplier', () => {
    expect(getMultiplier('champion')).toBe(2.0);
  });

  it('getTierForPoints returns correct tiers at boundaries', () => {
    expect(getTierForPoints(0)).toBe('explorer');
    expect(getTierForPoints(1999)).toBe('explorer');
    expect(getTierForPoints(2000)).toBe('engager');
    expect(getTierForPoints(9999)).toBe('engager');
    expect(getTierForPoints(10000)).toBe('influencer');
    expect(getTierForPoints(49999)).toBe('influencer');
    expect(getTierForPoints(50000)).toBe('champion');
    expect(getTierForPoints(999999)).toBe('champion');
  });

  it('multiplier math: champion doubles base points', () => {
    const base = ACTION_CONFIGS.daily_checkin.points;
    const result = Math.round(base * getMultiplier('champion'));
    expect(result).toBe(50); // 25 * 2.0 = 50
  });

  it('multiplier math: engager gets 20% bonus', () => {
    const base = ACTION_CONFIGS.read_article.points;
    const result = Math.round(base * getMultiplier('engager'));
    expect(result).toBe(5); // 4 * 1.2 = 4.8 -> rounds to 5
  });

  it('multiplier math: influencer gets 50% bonus on like', () => {
    const base = ACTION_CONFIGS.like.points;
    const result = Math.round(base * getMultiplier('influencer'));
    expect(result).toBe(2); // 1 * 1.5 = 1.5 -> rounds to 2
  });
});
