import { describe, it, expect } from 'vitest';
import { ACTION_CONFIGS } from '../src/constants/points.js';
import type { ActionType } from '../src/types/points.js';

describe('ACTION_CONFIGS — internal consistency', () => {
  it('every key matches its self-reference type field', () => {
    for (const [key, config] of Object.entries(ACTION_CONFIGS)) {
      expect(config.type).toBe(key);
    }
  });

  it('every action has positive points and a positive dailyCap', () => {
    for (const config of Object.values(ACTION_CONFIGS)) {
      expect(config.points).toBeGreaterThan(0);
      expect(config.dailyCap).toBeGreaterThan(0);
    }
  });

  it('each action falls into one of three categories', () => {
    const allowed = new Set(['content', 'engagement', 'growth']);
    for (const config of Object.values(ACTION_CONFIGS)) {
      expect(allowed.has(config.category)).toBe(true);
    }
  });

  it('exactly 16 actions are currently configured (P4 F6 baseline + P5 F6 welcome_bonus; 9 more deferred)', () => {
    expect(Object.keys(ACTION_CONFIGS)).toHaveLength(16);
  });

  it('every shipped ActionType union member has a corresponding config', () => {
    const expected: ActionType[] = [
      'read_article','watch_video','reel_watch','listen_podcast','read_thread',
      'like','comment','share','save','follow',
      'daily_checkin','create_content','content_trending','refer_friend','complete_profile',
      'welcome_bonus',
    ];
    for (const t of expected) {
      expect(ACTION_CONFIGS[t]).toBeDefined();
    }
  });

  it('welcome_bonus is +250 pts (Dev Spec §2.1 Screen 4)', () => {
    expect(ACTION_CONFIGS.welcome_bonus.points).toBe(250);
  });

  it('comment requires 10+ words server-side (Dev Spec §2.6 S18 + PWA post-detail copy)', () => {
    expect(ACTION_CONFIGS.comment.validation.minWordCount).toBe(10);
  });
});
