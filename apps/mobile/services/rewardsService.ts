import api from '@/services/api';

export type RewardStatus = 'active' | 'used' | 'expired';

export type Reward = {
  id: string;
  claimCode: string;
  status: RewardStatus;
  pointsSpent: number;
  expiresAt: string;
  usedAt?: string | null;
  createdAt?: string;
  offer: {
    id: string;
    type: 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';
    title: string;
    description?: string | null;
    imageUrl?: string | null;
    pointsCost: number;
    cashValue: number;
    validUntil: string;
    business?: { id: string; name: string; pincode: string } | null;
  };
};

export const rewardsService = {
  async list(status?: RewardStatus) {
    const res = await api.get('/rewards', { params: { status } });
    return res.data.rewards as Reward[];
  },
  async markUsed(id: string) {
    const res = await api.put(`/rewards/${id}/use`);
    return res.data.reward as Reward;
  },
};
