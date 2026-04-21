export interface WatchlistEntry {
  id: string;
  businessId: string;
  businessName: string;
  businessAvatarUrl: string | null;
  businessCategory: string | null;
  businessPincode: string | null;
  notifyOnOffers: boolean;
  activeOfferCount: number;
  createdAt: string;
}

export interface GetWatchlistResponse {
  items: WatchlistEntry[];
  total: number;
}

export interface AddWatchlistRequest {
  businessId: string;
}

export interface AddWatchlistResponse {
  entry: WatchlistEntry;
}

export interface SetNotifyRequest {
  notifyOnOffers: boolean;
}

// A live deal sourced from a business the user watches. Drives the
// Watchlist tab on My Rewards (one row per offer, sorted newest-first).
export interface WatchlistDealItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  cashValue: number;
  expiresAt: string;
  createdAt: string;
  businessId: string;
  businessName: string;
  businessAvatarUrl: string | null;
  businessCategory: string;
  businessPincode: string;
}

export interface WatchlistDealsResponse {
  items: WatchlistDealItem[];
}
