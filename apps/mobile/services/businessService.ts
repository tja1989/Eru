import api from '@/services/api';

export const businessService = {
  async get(id: string) {
    const res = await api.get(`/business/${id}`);
    return res.data.business;
  },
};
