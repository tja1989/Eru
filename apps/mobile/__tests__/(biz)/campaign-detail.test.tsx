/**
 * Campaign detail screen — owner-side.
 *  - Loading state before data resolves.
 *  - Active campaign renders read-only fields, no Edit button.
 *  - Draft campaign renders editable fields; Save calls updateCampaign().
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: {
    getCampaign: jest.fn(),
    updateCampaign: jest.fn(),
  },
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack }),
  useLocalSearchParams: () => ({ id: 'c-1' }),
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
import BizCampaignDetail from '@/app/(biz)/campaigns/[id]';

const mockedGet = bizService.getCampaign as jest.MockedFunction<typeof bizService.getCampaign>;
const mockedPatch = bizService.updateCampaign as jest.MockedFunction<typeof bizService.updateCampaign>;

const baseCampaign = {
  id: 'c-1',
  businessId: 'biz-1',
  type: 'promotion' as const,
  body: 'Original body',
  imageUrl: null,
  pincodes: ['682016'],
  ageRanges: [],
  interests: [],
  budget: 500,
  spent: 100,
  startDate: null,
  endDate: null,
  offerId: null,
  impressions: 1200,
  clicks: 80,
  claims: 12,
  storeVisits: 5,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('(biz)/campaigns/[id]', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPatch.mockReset();
    mockBack.mockReset();
  });

  it('shows a loading indicator before data resolves', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    const { getByTestId } = render(<BizCampaignDetail />);
    expect(getByTestId('biz-campaign-detail-loading')).toBeTruthy();
  });

  it('renders read-only fields for an active campaign and hides the Edit button', async () => {
    mockedGet.mockResolvedValueOnce({ ...baseCampaign, title: 'Live Drive', status: 'active' });
    const { findByText, queryByText } = render(<BizCampaignDetail />);
    expect(await findByText('Live Drive')).toBeTruthy();
    expect(await findByText('ACTIVE')).toBeTruthy();
    expect(await findByText('₹500')).toBeTruthy();
    expect(await findByText('₹100')).toBeTruthy();
    expect(queryByText('Edit')).toBeNull();
    expect(queryByText('Save')).toBeNull();
  });

  it('renders an editable form for a draft and PATCHes on Save', async () => {
    mockedGet.mockResolvedValueOnce({ ...baseCampaign, title: 'Draft Drive', status: 'draft' });
    mockedPatch.mockResolvedValueOnce({ ...baseCampaign, title: 'Draft Drive (Edited)', status: 'draft' });

    const { findByText, getByDisplayValue } = render(<BizCampaignDetail />);
    fireEvent.press(await findByText('Edit'));

    const titleInput = await waitFor(() => getByDisplayValue('Draft Drive'));
    fireEvent.changeText(titleInput, 'Draft Drive (Edited)');

    fireEvent.press(await findByText('Save'));

    await waitFor(() => {
      expect(mockedPatch).toHaveBeenCalledWith('c-1', expect.objectContaining({ title: 'Draft Drive (Edited)' }));
    });
  });
});
