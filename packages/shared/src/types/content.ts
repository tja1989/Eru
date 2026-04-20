export type ContentType = 'post' | 'reel' | 'poll' | 'thread';
export type ContentSubtype =
  | 'review'
  | 'recommendation'
  | 'vlog'
  | 'photo_story'
  | 'tutorial'
  | 'comparison'
  | 'unboxing'
  | 'event_coverage'
  | 'hot_take'
  | 'meme'
  | 'recipe'
  | 'local_guide';
export type ModerationStatus = 'pending' | 'published' | 'declined';
export type TranscodeStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type MediaType = 'image' | 'video';

export interface Content {
  id: string;
  userId: string;
  type: ContentType;
  subtype: ContentSubtype | null;
  commissionPctEarned: number;
  text: string | null;
  hashtags: string[];
  locationPincode: string | null;
  moderationStatus: ModerationStatus;
  declineReason: string | null;
  isTrending: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  pointsEarned: number;
  publishedAt: string | null;
  createdAt: string;
}

export interface ContentMedia {
  id: string;
  contentId: string;
  type: MediaType;
  originalUrl: string;
  thumbnailUrl: string | null;
  video360pUrl: string | null;
  video720pUrl: string | null;
  video1080pUrl: string | null;
  durationSeconds: number | null;
  width: number;
  height: number;
  sortOrder: number;
  transcodeStatus: TranscodeStatus;
}

export interface Comment {
  id: string;
  userId: string;
  contentId: string;
  text: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
}

export type InteractionType = 'like' | 'save' | 'share';

export interface FeedPost extends Content {
  media: ContentMedia[];
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    tier: string;
    isVerified: boolean;
  };
  isLiked: boolean;
  isSaved: boolean;
  commentsPreview: Comment[];
}
