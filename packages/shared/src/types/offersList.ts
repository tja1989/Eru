export type WireOfferType = 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';

export interface WireOffer {
  id: string;
  type: WireOfferType;
  businessId: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  cashValue: string;
  stock: number | null;
  perUserLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  business?: {
    id: string;
    name: string;
    category: string;
    pincode: string;
    avatarUrl: string | null;
  } | null;
}

export interface ListOffersResponse {
  offers: WireOffer[];
  page: number;
  limit: number;
  total: number;
}

export interface ClaimOfferResponse {
  reward: {
    id: string;
    claimCode: string;
    pointsSpent: number;
    expiresAt: string;
  };
}
