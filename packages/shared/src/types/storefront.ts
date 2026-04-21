// Storefront aggregate response — one round trip for the business detail screen.
// Used by GET /api/v1/businesses/:id/storefront.

export interface StorefrontBusiness {
  id: string;
  name: string;
  verified: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  category: string;
  pincode: string;
  since: number | null;
  description: string | null;
  hours: Array<{ day: string; open: string; close: string }>;
  phone: string | null;
  address: string | null;
  ratingAvg: number;
  ratingCount: number;
  responseTimeMinutes: number | null;
  followerCount: number;
  isFollowedByMe: boolean;
  openNow: boolean;
}

export interface StorefrontOffer {
  id: string;
  title: string;
  description: string | null;
  pointsCost: number;
  cashValue: number;
  imageUrl: string | null;
  expiresAt: string;
}

export interface StorefrontReview {
  id: string;
  userId: string;
  username: string;
  userAvatarUrl: string | null;
  rating: number | null;
  body: string;
  createdAt: string;
  isVerifiedEruCustomer: boolean;
}

export interface StorefrontTaggedContent {
  id: string;
  thumbnailUrl: string | null;
  mediaKind: 'photo' | 'video' | 'reel' | 'carousel';
  isTrending: boolean;
  durationSeconds: number | null;
}

export interface StorefrontResponse {
  business: StorefrontBusiness;
  offers: StorefrontOffer[];
  topReviews: StorefrontReview[];
  taggedContent: StorefrontTaggedContent[];
}
