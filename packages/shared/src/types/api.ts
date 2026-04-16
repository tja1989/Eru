export interface PaginatedResponse<T> {
  data: T[];
  nextPage: number | null;
  total: number;
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
