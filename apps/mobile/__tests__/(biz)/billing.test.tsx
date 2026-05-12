/**
 * Billing screen — current plan + monthly cap + topup/debit history.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getBilling: jest.fn() },
}));

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff', card: '#fff', g100: '#eee', g200: '#ddd', g400: '#888',
    g500: '#777', g600: '#555', g700: '#333', g800: '#222', orange: '#f60',
    navy: '#123', green: '#0a0', red: '#a00', blue: '#00f',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

import { bizService } from '@/services/bizService';
import BizBilling from '@/app/(biz)/billing';

const mockedGet = bizService.getBilling as jest.MockedFunction<typeof bizService.getBilling>;

describe('(biz)/billing', () => {
  beforeEach(() => mockedGet.mockReset());

  it('renders the current plan, cap, balance, and recent transactions', async () => {
    mockedGet.mockResolvedValueOnce({
      currentTier: 'growth',
      monthlyCapAmount: 5000,
      spentThisMonth: 1250,
      remaining: 3750,
      transactions: [
        { id: 't1', amount: -500, kind: 'campaign_debit', refId: 'c1', note: null, createdAt: new Date().toISOString() },
        { id: 't2', amount: 2000, kind: 'topup', refId: null, note: 'mock topup', createdAt: new Date().toISOString() },
      ],
    });
    const { findByText } = render(<BizBilling />);
    expect(await findByText('GROWTH')).toBeTruthy();
    expect(await findByText('₹3,750')).toBeTruthy(); // remaining balance
    expect(await findByText('campaign_debit')).toBeTruthy();
    expect(await findByText('topup')).toBeTruthy();
  });

  it('renders an empty state when no plan is set', async () => {
    mockedGet.mockResolvedValueOnce({
      currentTier: null,
      monthlyCapAmount: 0,
      spentThisMonth: 0,
      remaining: 0,
      transactions: [],
    });
    const { findByText } = render(<BizBilling />);
    expect(await findByText(/No plan yet/i)).toBeTruthy();
  });
});
