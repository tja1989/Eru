import { z } from 'zod';

// Reserved handles — banned to prevent impersonation of staff/system accounts
// and to keep namespaces like /me, /api free for routing.
const RESERVED_HANDLES = new Set([
  'admin', 'administrator', 'root', 'support', 'help', 'eru',
  'official', 'staff', 'team', 'moderator', 'mod', 'api', 'www',
  'mail', 'email', 'login', 'signup', 'signin', 'register',
  'undefined', 'null', 'user', 'users', 'me', 'self',
]);

// Instagram-style handle: lowercase letters, digits, underscore, period.
// Disallow leading/trailing/consecutive periods (matches IG behaviour) and
// the internal `pending_` prefix that the server uses for placeholders so a
// user can't squat that namespace.
export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9._]+$/, 'Use lowercase letters, numbers, underscore, period')
  .refine((s) => !s.startsWith('.') && !s.endsWith('.'), {
    message: "Can't start or end with a period",
  })
  .refine((s) => !s.includes('..'), {
    message: "Can't have consecutive periods",
  })
  .refine((s) => !RESERVED_HANDLES.has(s), {
    message: 'That handle is reserved',
  })
  .refine((s) => !s.startsWith('pending_'), {
    message: 'That handle is reserved',
  });

export const registerSchema = z.object({
  firebaseUid: z.string().min(1),
  phone: z.string().regex(/^\+\d{10,15}$/, 'Invalid phone format'),
  name: z.string().min(1).max(100),
  // The server overwrites this with a `pending_*` placeholder regardless,
  // so we accept any non-empty string here. The real validation happens on
  // PATCH /users/me when the user picks their final handle.
  username: z.string().min(1).max(50).optional(),
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
  businessTagId: z.string().uuid().optional(),
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
  username: usernameSchema.optional(),
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
  notifyWatchlistOffers: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  shareDataWithBrands: z.boolean().optional(),
  fcmToken: z.string().optional(),
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
