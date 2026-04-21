import api from '@/services/api';

export type SponsorshipStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'declined';

export type Proposal = {
  id: string;
  businessId: string;
  creatorId: string;
  contentId: string | null;
  boostAmount: string;
  commissionPct: string;
  creatorEarnings: string | null;
  status: SponsorshipStatus;
  reach: number;
  clicks: number;
  boostSpent: string;
  acceptedAt: string | null;
  business?: { id: string; name: string; avatarUrl?: string | null };
  content?: { id: string; text: string | null } | null;
};

export type CreatorDashboard = {
  activeCount: number;
  pendingCount: number;
  completedCount: number;
  totalEarnings: number | string;
  active: Proposal[];
  pending: Proposal[];
};

export const sponsorshipService = {
  async getDashboard(): Promise<CreatorDashboard> {
    const res = await api.get('/sponsorship/dashboard');
    return res.data;
  },
  async accept(id: string): Promise<Proposal> {
    const res = await api.post(`/sponsorship/${id}/accept`);
    return res.data.proposal;
  },
  async decline(id: string): Promise<Proposal> {
    const res = await api.post(`/sponsorship/${id}/decline`);
    return res.data.proposal;
  },
  async negotiate(id: string, counterBoostAmount: number, note?: string): Promise<Proposal> {
    const res = await api.post(`/sponsorship/${id}/negotiate`, { counterBoostAmount, note });
    return res.data.proposal;
  },
};
