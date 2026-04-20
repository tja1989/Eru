import api from './api';
import type {
  WalletHistoryResponse,
  WalletSummary,
  WalletExpiringResponse,
} from '@eru/shared';

export const walletService = {
  getWallet: (): Promise<WalletSummary> =>
    api.get('/wallet').then((r) => r.data.wallet),
  getHistory: (page = 1): Promise<WalletHistoryResponse> =>
    api.get('/wallet/history', { params: { page } }).then((r) => r.data),
  getExpiring: (): Promise<WalletExpiringResponse> =>
    api.get('/wallet/expiring').then((r) => r.data),
};
