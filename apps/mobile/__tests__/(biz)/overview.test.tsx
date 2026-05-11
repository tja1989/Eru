/**
 * Biz Overview screen — fetches BizDashboardResponse, renders KPI tiles,
 * 7-day chart, sentiment counts, recent activity. Asserts loading vs
 * resolved states.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getDashboard: jest.fn() },
}));

jest.mock('@/constants/theme', () => ({
  colors: {
    bg: '#fff', card: '#fff', g100: '#eee', g200: '#ddd', g400: '#888',
    g600: '#555', g800: '#222', orange: '#f60', navy: '#123', green: '#0a0',
    red: '#a00', g500: '#777',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 },
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
}));

import { bizService } from '@/services/bizService';
import BizOverview from '@/app/(biz)/overview';

const mockedGetDashboard = bizService.getDashboard as jest.MockedFunction<typeof bizService.getDashboard>;

describe('(biz)/overview', () => {
  beforeEach(() => {
    mockedGetDashboard.mockReset();
  });

  it('shows a loading indicator before data resolves', () => {
    mockedGetDashboard.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByTestId } = render(<BizOverview />);
    expect(getByTestId('biz-overview-loading')).toBeTruthy();
  });

  it('renders KPI tiles, sentiment counts, and recent activity after data resolves', async () => {
    mockedGetDashboard.mockResolvedValue({
      period: 'week',
      kpis: {
        impressions: 1200,
        clicks: 84,
        ctr: 0.07,
        claims: 21,
        visits: 12,
        spent: 500,
        costPerVisit: 41.66,
      },
      dailyImpressions: [10, 50, 80, 200, 300, 400, 160],
      sentiment: { positive: 32, neutral: 8, negative: 4 },
      recentActivity: [
        { kind: 'launch', message: 'Diwali campaign launched', createdAt: new Date().toISOString() },
        { kind: 'claim', message: '5 new offer claims today', createdAt: new Date().toISOString() },
      ],
    });

    const { findByText, queryByTestId } = render(<BizOverview />);
    await findByText('Impressions');
    expect(await findByText('Clicks')).toBeTruthy();
    expect(await findByText('Claims')).toBeTruthy();
    expect(await findByText('Visits')).toBeTruthy();
    expect(await findByText('1,200')).toBeTruthy();
    expect(await findByText('84')).toBeTruthy();

    // Sentiment counts
    expect(await findByText('Positive')).toBeTruthy();
    expect(await findByText('32')).toBeTruthy();
    expect(await findByText('Neutral')).toBeTruthy();
    expect(await findByText('Negative')).toBeTruthy();

    // Recent activity
    expect(await findByText(/Diwali campaign launched/)).toBeTruthy();

    await waitFor(() => {
      expect(queryByTestId('biz-overview-loading')).toBeNull();
    });
  });
});
