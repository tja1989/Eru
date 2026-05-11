import api from './api';
import type {
  BizAudienceResponse,
  BizCampaign,
  BizCampaignCreateInput,
  BizCampaignListResponse,
  BizCampaignStatus,
  BizDashboardPeriod,
  BizDashboardResponse,
  BizFeedbackResponse,
  BizMeResponse,
  BizOfferCreateInput,
  BizOfferItem,
  BizOffersResponse,
  BizOnboardingInput,
  BizOnboardingSetupResponse,
  BizPaymentResponse,
  BizPlanResponse,
  BizPlanTier,
  BizQrScanResponse,
  BizUgcResponse,
} from '@eru/shared';

// The owner-side Business Dashboard API client. Each method maps 1:1 to a
// /api/v1/biz/* endpoint and returns its shared response type — no fallback
// chains, per the field-drift lockdown convention (CLAUDE.md).
export const bizService = {
  getMe: (): Promise<BizMeResponse> =>
    api.get('/biz/me').then((r) => r.data),

  getDashboard: (period: BizDashboardPeriod = 'week'): Promise<BizDashboardResponse> =>
    api.get('/biz/dashboard', { params: { period } }).then((r) => r.data),

  getCampaigns: (status?: BizCampaignStatus): Promise<BizCampaignListResponse> =>
    api.get('/biz/campaigns', { params: status ? { status } : {} }).then((r) => r.data),

  // No GET /biz/campaigns/:id yet — derived from the list. Cheap enough at
  // the current campaign volumes; a dedicated endpoint can land later if
  // an owner ever crosses ~hundreds of campaigns.
  getCampaign: async (id: string): Promise<BizCampaign> => {
    const list = await api.get('/biz/campaigns').then((r) => r.data) as BizCampaignListResponse;
    const found = list.items.find((c) => c.id === id);
    if (!found) throw new Error('Campaign not found');
    return found;
  },

  updateCampaign: (id: string, patch: Partial<BizCampaignCreateInput>): Promise<BizCampaign> =>
    api.patch(`/biz/campaigns/${id}`, patch).then((r) => r.data),

  createCampaign: (input: BizCampaignCreateInput): Promise<BizCampaign> =>
    api.post('/biz/campaigns', input).then((r) => r.data),

  launchCampaign: (id: string): Promise<BizCampaign> =>
    api.post(`/biz/campaigns/${id}/launch`).then((r) => r.data),

  getUgc: (): Promise<BizUgcResponse> =>
    api.get('/biz/ugc').then((r) => r.data),

  boostUgc: (contentId: string, amount: number): Promise<{ proposalId: string }> =>
    api.post(`/biz/ugc/${contentId}/boost`, { amount }).then((r) => r.data),

  getFeedback: (sentiment?: 'positive' | 'neutral' | 'negative'): Promise<BizFeedbackResponse> =>
    api.get('/biz/feedback', { params: sentiment ? { sentiment } : {} }).then((r) => r.data),

  replyFeedback: (contentId: string, text: string): Promise<{ reply: { text: string; createdAt: string } }> =>
    api.post(`/biz/feedback/${contentId}/reply`, { text }).then((r) => r.data),

  getAudience: (): Promise<BizAudienceResponse> =>
    api.get('/biz/audience').then((r) => r.data),

  getOffers: (): Promise<BizOffersResponse> =>
    api.get('/biz/offers').then((r) => r.data),

  createOffer: (input: BizOfferCreateInput): Promise<BizOfferItem> =>
    api.post('/biz/offers', input).then((r) => r.data),

  updateOffer: (id: string, patch: Partial<BizOfferCreateInput> & { isActive?: boolean }): Promise<BizOfferItem> =>
    api.patch(`/biz/offers/${id}`, patch).then((r) => r.data),

  scanQr: (claimCode: string): Promise<BizQrScanResponse> =>
    api.post('/biz/qrscan', { claimCode }).then((r) => r.data),

  onboardingSetup: (input: BizOnboardingInput): Promise<BizOnboardingSetupResponse> =>
    api.post('/biz/onboarding/setup', input).then((r) => r.data),

  onboardingPincodes: (pincodes: string[]): Promise<BizOnboardingSetupResponse> =>
    api.post('/biz/onboarding/pincodes', { pincodes }).then((r) => r.data),

  onboardingPlan: (tier: BizPlanTier): Promise<BizPlanResponse> =>
    api.post('/biz/onboarding/plan', { tier }).then((r) => r.data),

  onboardingPayment: (amount: number): Promise<BizPaymentResponse> =>
    api.post('/biz/onboarding/payment', { amount }).then((r) => r.data),
};
