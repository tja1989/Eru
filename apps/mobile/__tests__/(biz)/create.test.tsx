/**
 * Create-Ad wizard scaffold (BD B3.1).
 *  - Step 1 (Content) renders on mount.
 *  - Next advances to Step 2 (Target) ONLY after required content fields filled.
 *  - Back from Step 2 returns to Step 1 with collected content preserved.
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@/services/bizService', () => ({
  bizService: { createCampaign: jest.fn(), launchCampaign: jest.fn() },
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
}));

// Stub: render a Pressable that immediately calls onChange with one pincode
// so the wizard Target step is satisfied for the launch flow.
jest.mock('@/components/biz/PincodeMultiSelect', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    PincodeMultiSelect: ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
      <TouchableOpacity testID="stub-pincode-add" onPress={() => onChange([...value, '682016'])}>
        <Text>Add pincode</Text>
      </TouchableOpacity>
    ),
  };
});

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
import BizCreate from '@/app/(biz)/create';

const mockedCreate = bizService.createCampaign as jest.MockedFunction<typeof bizService.createCampaign>;
const mockedLaunch = bizService.launchCampaign as jest.MockedFunction<typeof bizService.launchCampaign>;

describe('(biz)/create', () => {
  beforeEach(() => {
    mockedCreate.mockReset();
    mockedLaunch.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it('renders Step 1 (Content) on mount', () => {
    const { getByPlaceholderText } = render(<BizCreate />);
    expect(getByPlaceholderText(/Catchy title/i)).toBeTruthy();
  });

  it('does NOT advance until required content fields are filled', () => {
    const { getByText, queryByText, getByPlaceholderText } = render(<BizCreate />);
    // No title typed → tapping Next should not show Step 2
    fireEvent.press(getByText('Next'));
    expect(queryByText(/Target your audience/i)).toBeNull();

    fireEvent.changeText(getByPlaceholderText(/Catchy title/i), 'Diwali Drive');
    fireEvent.press(getByText('Next'));
    expect(getByText(/Target your audience/i)).toBeTruthy();
  });

  it('Back from Step 2 returns to Step 1 with content state preserved', () => {
    const { getByText, getByPlaceholderText, getByDisplayValue } = render(<BizCreate />);
    fireEvent.changeText(getByPlaceholderText(/Catchy title/i), 'Holi Splash');
    fireEvent.press(getByText('Next'));
    expect(getByText(/Target your audience/i)).toBeTruthy();

    fireEvent.press(getByText('Back'));
    // Step 1 again, title input still has the value
    expect(getByDisplayValue('Holi Splash')).toBeTruthy();
  });

  it('Launch calls createCampaign then launchCampaign and navigates to the campaigns list', async () => {
    mockedCreate.mockResolvedValueOnce({
      id: 'c-new', businessId: 'biz-1', type: 'promotion', status: 'draft', title: 'Diwali Drive',
      body: null, imageUrl: null, pincodes: ['682016'], ageRanges: [], interests: [],
      budget: 500, spent: 0, startDate: null, endDate: null, offerId: null,
      impressions: 0, clicks: 0, claims: 0, storeVisits: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    mockedLaunch.mockResolvedValueOnce({
      id: 'c-new', businessId: 'biz-1', type: 'promotion', status: 'active', title: 'Diwali Drive',
      body: null, imageUrl: null, pincodes: ['682016'], ageRanges: [], interests: [],
      budget: 500, spent: 0, startDate: null, endDate: null, offerId: null,
      impressions: 0, clicks: 0, claims: 0, storeVisits: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    const { getByText, getByPlaceholderText, getByTestId } = render(<BizCreate />);

    // Step 1 — title
    fireEvent.changeText(getByPlaceholderText(/Catchy title/i), 'Diwali Drive');
    fireEvent.press(getByText('Next'));
    // Step 2 — add pincode via stub
    fireEvent.press(getByTestId('stub-pincode-add'));
    fireEvent.press(getByText('Next'));
    // Step 3 — budget already populated default 500
    fireEvent.press(getByText('Next'));
    // Step 4 — Launch
    fireEvent.press(getByText('Launch'));

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledTimes(1);
      expect(mockedLaunch).toHaveBeenCalledWith('c-new');
      expect(mockPush).toHaveBeenCalledWith('/(biz)/campaigns');
    });
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Diwali Drive',
      pincodes: ['682016'],
      budget: 500,
    }));
  });
});
