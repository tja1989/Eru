import api from './api';
import type { WatchlistEntry, GetWatchlistResponse } from '@eru/shared';

export const watchlistService = {
  list: async (): Promise<GetWatchlistResponse> => {
    const res = await api.get('/watchlist');
    return res.data;
  },

  add: async (businessId: string): Promise<WatchlistEntry> => {
    const res = await api.post('/watchlist', { businessId });
    return res.data.entry;
  },

  remove: async (businessId: string): Promise<void> => {
    await api.delete(`/watchlist/${businessId}`);
  },

  setNotify: async (businessId: string, notifyOnOffers: boolean): Promise<void> => {
    await api.patch(`/watchlist/${businessId}`, { notifyOnOffers });
  },
};
