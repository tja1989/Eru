// Business Dashboard shared types — locks the API ↔ mobile contract for
// every /api/v1/biz/* endpoint per the field-drift lockdown convention.
//
// Conventions:
//  - Snake-case DB columns are exposed as camelCase here.
//  - Decimal columns are serialized to JS numbers at the API boundary.
//  - Enum string-literal unions mirror Prisma enums in apps/api/prisma/schema.prisma.

// ---------- Enums (mirror Prisma) ----------

export type BizCampaignType =
  | 'promotion'
  | 'brand_awareness'
  | 'new_launch'
  | 'poll'
  | 'event'
  | 'contest'
  | 'seasonal'
  | 'review_request'
  | 'restock'
  | 'hiring';

export type BizCampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export type BizPlanTier = 'starter' | 'growth' | 'pro';

export type BizTxKind =
  | 'topup'
  | 'campaign_debit'
  | 'ugc_boost_debit'
  | 'refund'
  | 'adjustment';

export type BizDashboardPeriod = 'week' | 'month' | '90d';

// ---------- B1.4: GET /biz/me ----------

export interface BizBusinessSummary {
  id: string;
  name: string;
  category: string;
  pincode: string;
  address: string | null;
  phone: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  targetPincodes: string[];
  followerCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface BizMeResponse {
  business: BizBusinessSummary | null;
}

// ---------- B6.1: POST /biz/onboarding/setup ----------

export interface BizOnboardingInput {
  name: string;
  category: string;
  pincode: string;
  address?: string;
  phone?: string;
}

// ---------- B2.1: GET /biz/dashboard ----------

export interface BizDashboardKpis {
  impressions: number;
  clicks: number;
  ctr: number;
  claims: number;
  visits: number;
  spent: number;
  costPerVisit: number;
}

export interface BizDashboardSentiment {
  positive: number;
  neutral: number;
  negative: number;
}

export interface BizDashboardActivityItem {
  kind: string;
  message: string;
  createdAt: string;
}

export interface BizDashboardResponse {
  period: BizDashboardPeriod;
  kpis: BizDashboardKpis;
  dailyImpressions: number[]; // length 7
  sentiment: BizDashboardSentiment;
  recentActivity: BizDashboardActivityItem[];
}

// ---------- B2.2: campaigns ----------

export interface BizCampaign {
  id: string;
  businessId: string;
  type: BizCampaignType;
  status: BizCampaignStatus;
  title: string;
  body: string | null;
  imageUrl: string | null;
  pincodes: string[];
  ageRanges: string[];
  interests: string[];
  budget: number;
  spent: number;
  startDate: string | null;
  endDate: string | null;
  offerId: string | null;
  impressions: number;
  clicks: number;
  claims: number;
  storeVisits: number;
  createdAt: string;
  updatedAt: string;
}

export interface BizCampaignListResponse {
  items: BizCampaign[];
}

export interface BizCampaignCreateInput {
  type: BizCampaignType;
  title: string;
  body?: string;
  imageUrl?: string;
  pincodes?: string[];
  ageRanges?: string[];
  interests?: string[];
  budget?: number;
  startDate?: string;
  endDate?: string;
  offerId?: string;
}

// ---------- B4.1: UGC ----------

export interface BizUgcContentItem {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  text: string;
  imageUrl: string | null;
  createdAt: string;
  isSponsored: boolean;
  sponsorshipId: string | null;
}

export interface BizUgcResponse {
  stats: { tagged: number; sponsored: number; reachEstimate: number };
  newTags: BizUgcContentItem[];
  activeSponsorships: BizUgcContentItem[];
}

// ---------- B4.2: feedback ----------

export interface BizFeedbackItem {
  contentId: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  text: string;
  rating: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  createdAt: string;
  reply: { text: string; createdAt: string } | null;
}

export interface BizFeedbackResponse {
  items: BizFeedbackItem[];
}

// ---------- B5.1: audience ----------

export interface BizAudienceBucket {
  label: string;
  count: number;
}

export interface BizAudienceResponse {
  ageBuckets: BizAudienceBucket[];
  topPincodes: BizAudienceBucket[];
  peakHours: number[]; // length 24
  topInterests: BizAudienceBucket[];
}

// ---------- B6.3: plans + billing ----------

export interface BizPlanTierDef {
  tier: BizPlanTier;
  monthlyPrice: number;
  monthlyCapAmount: number;
  pincodeCap: number;
  features: string[];
}

export interface BizPlansResponse {
  tiers: BizPlanTierDef[];
}

export interface BizTransaction {
  id: string;
  amount: number;
  kind: BizTxKind;
  refId: string | null;
  note: string | null;
  createdAt: string;
}

export interface BizBillingResponse {
  currentTier: BizPlanTier | null;
  monthlyCapAmount: number;
  spentThisMonth: number;
  remaining: number;
  transactions: BizTransaction[];
}

// ---------- B5.2: owner-side offers ----------

export type BizOfferType = 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';

export interface BizOfferItem {
  id: string;
  type: BizOfferType;
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  cashValue: number;
  stock: number | null;
  perUserLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
}

export interface BizOffersResponse {
  items: BizOfferItem[];
}

export interface BizOfferCreateInput {
  type: BizOfferType;
  title: string;
  description?: string;
  imageUrl?: string;
  pointsCost: number;
  cashValue: number;
  stock?: number;
  perUserLimit?: number;
  validFrom: string;
  validUntil: string;
}

// ---------- Compile-time guarantee that every promised export exists ----------
// If any of the symbols below is renamed or removed, tsc will fail with TS2304.
// This is the "type-level test" for B1.3.

type _BizExportsAssertion = [
  BizCampaignType,
  BizCampaignStatus,
  BizPlanTier,
  BizTxKind,
  BizDashboardPeriod,
  BizMeResponse,
  BizOnboardingInput,
  BizDashboardResponse,
  BizCampaign,
  BizCampaignListResponse,
  BizCampaignCreateInput,
  BizUgcResponse,
  BizFeedbackResponse,
  BizAudienceResponse,
  BizPlansResponse,
  BizBillingResponse,
  BizTransaction,
  BizOfferItem,
  BizOffersResponse,
  BizOfferCreateInput,
];
