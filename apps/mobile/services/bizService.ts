import api from './api';
import type { BizDashboardPeriod, BizDashboardResponse, BizMeResponse } from '@eru/shared';

// The owner-side Business Dashboard API client. Each method maps 1:1 to a
// /api/v1/biz/* endpoint and returns its shared response type — no fallback
// chains, per the field-drift lockdown convention (CLAUDE.md).
export const bizService = {
  getMe: (): Promise<BizMeResponse> =>
    api.get('/biz/me').then((r) => r.data),

  getDashboard: (period: BizDashboardPeriod = 'week'): Promise<BizDashboardResponse> =>
    api.get('/biz/dashboard', { params: { period } }).then((r) => r.data),
};
