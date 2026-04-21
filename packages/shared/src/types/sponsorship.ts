export type WireSponsorshipStatus = 'pending' | 'accepted' | 'active' | 'completed' | 'declined';

export interface WireSponsorshipProposal {
  id: string;
  businessId: string;
  contentId: string | null;
  creatorId: string;
  boostAmount: string;
  commissionPct: string;
  creatorEarnings: string | null;
  status: WireSponsorshipStatus;
  reach: number;
  clicks: number;
  boostSpent: string;
  acceptedAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
  business?: { id: string; name: string; avatarUrl: string | null };
  content?: { id: string; text: string | null } | null;
}

export interface CreatorDashboardResponse {
  activeCount: number;
  pendingCount: number;
  completedCount: number;
  totalEarnings: number | string;
  active: WireSponsorshipProposal[];
  pending: WireSponsorshipProposal[];
}

export interface SponsorshipActionResponse {
  proposal: WireSponsorshipProposal;
}
