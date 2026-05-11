import api from './api';
import type {
  BizCampaign,
  BizCampaignCreateInput,
  BizCampaignListResponse,
  BizCampaignStatus,
  BizDashboardPeriod,
  BizDashboardResponse,
  BizMeResponse,
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
};
