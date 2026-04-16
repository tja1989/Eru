import api from './api';

export const feedService = {
  getFeed: (page = 1, limit = 20, pincode?: string) =>
    api.get('/feed', { params: { page, limit, pincode } }).then((r) => r.data),
  getStories: () => api.get('/stories').then((r) => r.data),
  getWalletSummary: () => api.get('/wallet/summary').then((r) => r.data),
};
