/**
 * Campaigns list screen — owner-side. Tabs filter by status; cards link
 * to (biz)/campaigns/[id]. Asserts loading vs resolved state and that
 * tab presses refetch with the right status query.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { getCampaigns: jest.fn() },
}));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
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
import BizCampaignsList from '@/app/(biz)/campaigns/index';

const mockedGet = bizService.getCampaigns as jest.MockedFunction<typeof bizService.getCampaigns>;

const baseCampaign = {
  businessId: 'biz-1',
  type: 'promotion' as const,
  body: null,
  imageUrl: null,
  pincodes: [],
  ageRanges: [],
  interests: [],
  budget: 500,
  spent: 0,
  startDate: null,
  endDate: null,
  offerId: null,
  impressions: 0,
  clicks: 0,
  claims: 0,
  storeVisits: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('(biz)/campaigns/index', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockPush.mockReset();
  });

  it('renders the loading indicator before campaigns resolve', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<BizCampaignsList />);
    expect(getByTestId('biz-campaigns-loading')).toBeTruthy();
  });

  it('renders campaign titles and filters via tab selection', async () => {
    // First load (All)
    mockedGet.mockResolvedValueOnce({
      items: [
        { ...baseCampaign, id: 'c1', title: 'Diwali Drive', status: 'active' },
        { ...baseCampaign, id: 'c2', title: 'Holi Splash', status: 'draft' },
      ],
    });
    const { findByText, getByText } = render(<BizCampaignsList />);

    expect(await findByText('Diwali Drive')).toBeTruthy();
    expect(await findByText('Holi Splash')).toBeTruthy();
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(mockedGet).toHaveBeenCalledWith(undefined);

    // Tap "Draft" tab → service refetches with status=draft
    mockedGet.mockResolvedValueOnce({
      items: [{ ...baseCampaign, id: 'c2', title: 'Holi Splash', status: 'draft' }],
    });
    fireEvent.press(getByText('Draft'));

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalledTimes(2);
      expect(mockedGet).toHaveBeenLastCalledWith('draft');
    });
  });

  it('navigates to detail screen when a card is tapped', async () => {
    mockedGet.mockResolvedValueOnce({
      items: [{ ...baseCampaign, id: 'c-target', title: 'Target', status: 'active' }],
    });
    const { findByText } = render(<BizCampaignsList />);
    const card = await findByText('Target');
    fireEvent.press(card);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/(biz)/campaigns/c-target'));
  });
});
