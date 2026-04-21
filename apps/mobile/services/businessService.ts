import api from '@/services/api';
import type { BusinessSearchItem, BusinessSearchResponse } from '@eru/shared';

export const businessService = {
  async get(id: string) {
    const res = await api.get(`/business/${id}`);
    return res.data.business;
  },

  // Autocomplete search used by the create-screen BusinessTagPicker.
  // Returns an empty array when the query is blank so the UI doesn't need
  // to branch — it just renders nothing until the user types a real letter.
  async search(q: string): Promise<BusinessSearchItem[]> {
    const query = q.trim();
    if (!query) return [];
    const res = await api.get('/businesses/search', { params: { q: query } });
    return (res.data as BusinessSearchResponse).items;
  },
};
