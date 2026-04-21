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
