export interface PaginatedResponse<T> {
  data: T[];
  nextPage: number | null;
  total: number;
}

// Shape returned by GET /users/:id/content.
// Date fields use `string | Date` because Fastify serializes Dates to strings
// over the wire — API handlers pass Prisma Dates directly, mobile receives strings.
export interface UserContentItem {
  id: string;
  userId: string;
  type: string;
  subtype: string | null;
  text: string | null;
  moderationStatus: string;
  declineReason: string | null;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  shareCount: number;
  hashtags: string[];
  publishedAt: string | Date | null;
  createdAt: string | Date;
  media: Array<{
    id: string;
    type: string;
    originalUrl: string;
    thumbnailUrl: string | null;
  }>;
}

export interface GetUserContentResponse {
  content: UserContentItem[];
  page: number;
  limit: number;
}

// GET /trending — top hashtags + top content from the last 48h.
// `trendingContent` items keep `unknown` item shape — they're Prisma Content
// rows with media + user and the same Date-vs-string concerns as other feeds.
export interface TrendingHashtag {
  tag: string;
  count: number;
}

export interface TrendingResponse {
  trendingHashtags: TrendingHashtag[];
  trendingContent: unknown[];
}

// GET /search — three-way search across users, posts, and hashtags.
export interface SearchResponse {
  users: Array<{
    id: string;
    name: string | null;
    username: string;
    avatarUrl: string | null;
    isVerified: boolean;
    tier: string;
    bio: string | null;
  }>;
  posts: unknown[];
  hashtags: string[];
}

export interface ApiError {
  error: string;
  code: string;
  statusCode: number;
}

export interface RegisterRequest {
  firebaseUid: string;
  phone: string;
  name: string;
  username: string;
}

export interface CreateContentRequest {
  type: 'post' | 'reel' | 'poll' | 'thread';
  text?: string;
  mediaIds: string[];
  hashtags: string[];
  locationPincode?: string;
}

export interface EarnRequest {
  actionType: string;
  contentId?: string;
  metadata?: { watchTimeSeconds?: number; wordCount?: number; };
}

export interface UpdateSettingsRequest {
  name?: string;
  bio?: string;
  gender?: 'male' | 'female' | 'other';
  dob?: string;
  primaryPincode?: string;
  secondaryPincodes?: string[];
  interests?: string[];
  contentLanguages?: string[];
  appLanguage?: string;
  notificationPush?: boolean;
  notificationEmail?: boolean;
  isPrivate?: boolean;
  shareDataWithBrands?: boolean;
}
