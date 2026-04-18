import api from '@/services/api';

export type PincodeResult = {
  pincode: string;
  area: string;
  district: string;
  state: string;
};

export const locationsService = {
  async search(q: string): Promise<PincodeResult[]> {
    const res = await api.get('/locations', { params: { q } });
    return (res.data.results ?? []) as PincodeResult[];
  },
};
