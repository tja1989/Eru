import api from './api';

export const walletService = {
  getWallet: () => api.get('/wallet').then((r) => r.data),
  getHistory: (page = 1) => api.get('/wallet/history', { params: { page } }).then((r) => r.data),
  getExpiring: () => api.get('/wallet/expiring').then((r) => r.data),
};
