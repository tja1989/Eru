import api from '@/services/api';

export type Offer = {
  id: string;
  type: 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';
  title: string;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  cashValue: number;
  validUntil: string;
  business?: { id: string; name: string; pincode: string } | null;
};

export const offersService = {
  async list(type: Offer['type'] | 'all' = 'all') {
    const res = await api.get('/offers', { params: { type } });
    return res.data.offers as Offer[];
  },
  async claim(offerId: string) {
    const res = await api.post(`/offers/${offerId}/claim`);
    return res.data.reward;
  },
};
