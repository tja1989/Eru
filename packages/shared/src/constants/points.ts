import type { ActionType } from '../types/points.js';

export interface ActionConfig {
  type: ActionType;
  category: 'content' | 'engagement' | 'growth';
  points: number;
  dailyCap: number;
  requiresContentId: boolean;
  validation: { minWatchTimeSeconds?: number; minScrollDepth?: number; minWordCount?: number; };
}

export const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  read_article: { type: 'read_article', category: 'content', points: 4, dailyCap: 20, requiresContentId: true, validation: { minScrollDepth: 0.7, minWatchTimeSeconds: 30 } },
  watch_video: { type: 'watch_video', category: 'content', points: 6, dailyCap: 15, requiresContentId: true, validation: { minWatchTimeSeconds: 60 } },
  reel_watch: { type: 'reel_watch', category: 'content', points: 3, dailyCap: 30, requiresContentId: true, validation: {} },
  listen_podcast: { type: 'listen_podcast', category: 'content', points: 5, dailyCap: 10, requiresContentId: true, validation: { minWatchTimeSeconds: 120 } },
  read_thread: { type: 'read_thread', category: 'content', points: 3, dailyCap: 10, requiresContentId: true, validation: {} },
  like: { type: 'like', category: 'engagement', points: 1, dailyCap: 50, requiresContentId: true, validation: {} },
  comment: { type: 'comment', category: 'engagement', points: 3, dailyCap: 20, requiresContentId: true, validation: { minWordCount: 10 } },
  share: { type: 'share', category: 'engagement', points: 2, dailyCap: 20, requiresContentId: true, validation: {} },
  save: { type: 'save', category: 'engagement', points: 1, dailyCap: 30, requiresContentId: true, validation: {} },
  follow: { type: 'follow', category: 'engagement', points: 2, dailyCap: 10, requiresContentId: false, validation: {} },
  daily_checkin: { type: 'daily_checkin', category: 'growth', points: 25, dailyCap: 1, requiresContentId: false, validation: {} },
  create_content: { type: 'create_content', category: 'growth', points: 30, dailyCap: 5, requiresContentId: true, validation: {} },
  content_trending: { type: 'content_trending', category: 'growth', points: 200, dailyCap: 1, requiresContentId: true, validation: {} },
  refer_friend: { type: 'refer_friend', category: 'growth', points: 100, dailyCap: 3, requiresContentId: false, validation: {} },
  complete_profile: { type: 'complete_profile', category: 'growth', points: 50, dailyCap: 1, requiresContentId: false, validation: {} },
};

export const DAILY_POINTS_GOAL = 250;
export const POINTS_EXPIRY_MONTHS = 6;
export const POINTS_EXPIRY_WARNING_DAYS = 30;
export const POINT_FACE_VALUE_INR = 0.01;
