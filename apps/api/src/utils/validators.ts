import { z } from 'zod';

export const registerSchema = z.object({
  firebaseUid: z.string().min(1),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone format'),
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export const createContentSchema = z.object({
  type: z.enum(['post', 'reel', 'poll', 'thread']),
  subtype: z.enum([
    'review',
    'recommendation',
    'vlog',
    'photo_story',
    'tutorial',
    'comparison',
    'unboxing',
    'event_coverage',
    'hot_take',
    'meme',
    'recipe',
    'local_guide',
  ]),
  text: z.string().max(2200).optional(),
  mediaIds: z.array(z.string().uuid()).default([]),
  hashtags: z.array(z.string().max(50)).max(30).default([]),
  locationPincode: z.string().length(6).optional(),
  pollOptions: z.array(z.string().min(1).max(200)).optional(),
  threadParts: z.array(z.string().min(1).max(2200)).optional(),
  taggedUserIds: z
    .array(z.string().uuid())
    .optional()
    .transform((ids) => (ids ? Array.from(new Set(ids)) : ids))
    .pipe(z.array(z.string().uuid()).max(10).optional()),
}).refine((data) => {
  // poll type MUST have 2–4 options and MUST NOT supply threadParts
  if (data.type === 'poll') {
    if (data.threadParts !== undefined && data.threadParts.length > 0) return false;
    return Array.isArray(data.pollOptions) && data.pollOptions.length >= 2 && data.pollOptions.length <= 4;
  }
  // non-poll types MUST NOT supply pollOptions
  if (data.pollOptions !== undefined && data.pollOptions.length > 0) {
    return false;
  }
  // thread type MUST have 2–10 parts and MUST NOT supply pollOptions
  if (data.type === 'thread') {
    if (data.pollOptions !== undefined && data.pollOptions.length > 0) return false;
    return Array.isArray(data.threadParts) && data.threadParts.length >= 2 && data.threadParts.length <= 10;
  }
  // non-thread types MUST NOT supply threadParts
  if (data.threadParts !== undefined && data.threadParts.length > 0) {
    return false;
  }
  return true;
}, {
  message: 'Poll type requires 2–4 options; thread type requires 2–10 parts; non-thread/poll types must not include those fields',
});

export const earnSchema = z.object({
  actionType: z.enum([
    'read_article', 'watch_video', 'reel_watch', 'listen_podcast', 'read_thread',
    'like', 'comment', 'share', 'save', 'follow',
    'daily_checkin', 'create_content', 'content_trending', 'refer_friend', 'complete_profile',
  ]),
  contentId: z.string().uuid().optional(),
  metadata: z.object({
    watchTimeSeconds: z.number().positive().optional(),
    wordCount: z.number().positive().optional(),
  }).optional(),
});

export const updateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  dob: z.string().date().optional(),
  primaryPincode: z.string().length(6).optional(),
  secondaryPincodes: z.array(z.string().length(6)).max(5).optional(),
  interests: z.array(z.string()).optional(),
  contentLanguages: z.array(z.string()).optional(),
  appLanguage: z.string().optional(),
  notificationPush: z.boolean().optional(),
  notificationEmail: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  shareDataWithBrands: z.boolean().optional(),
});

export const commentSchema = z.object({
  text: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const feedQuerySchema = paginationSchema.extend({
  pincode: z.string().length(6).optional(),
});

export const exploreQuerySchema = paginationSchema.extend({
  category: z.string().default('all'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
});

export const reelsQuerySchema = paginationSchema.extend({
  tab: z.enum(['foryou', 'following', 'local']).default('foryou'),
});

export const leaderboardQuerySchema = z.object({
  scope: z.enum(['pincode', 'state', 'national', 'friends']).default('pincode'),
  pincode: z.string().length(6).optional(),
});

export const moderationDeclineSchema = z.object({
  code: z.enum(['MOD-01', 'MOD-02', 'MOD-03', 'MOD-04', 'MOD-05', 'MOD-06', 'MOD-07']),
});

export const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const reportContentSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'nudity', 'hate', 'violence', 'misinformation', 'other']),
  notes: z.string().max(500).optional(),
});

export const offersQuerySchema = z.object({
  type: z.enum(['local', 'giftcard', 'recharge', 'donate', 'premium', 'all']).default('all'),
  pincode: z.string().length(6).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
