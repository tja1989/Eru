import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MyRewardsScreen from '@/app/my-rewards/index';
import { rewardsService } from '@/services/rewardsService';

jest.mock('@/services/rewardsService');
jest.mock('@/services/watchlistService', () => ({
  watchlistService: {
    list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    listDeals: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('@/services/offersService', () => ({
  offersService: { claim: jest.fn() },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

describe('<MyRewardsScreen /> — 4 tabs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rewardsService.list as jest.Mock).mockResolvedValue([]);
  });

  it('renders 4 tabs: Active, Watchlist, Used, Expired', () => {
    const { getByText } = render(<MyRewardsScreen />);
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('Watchlist')).toBeTruthy();
    expect(getByText('Used')).toBeTruthy();
    expect(getByText('Expired')).toBeTruthy();
  });

  it('Active tab is selected by default', () => {
    const { getByTestId } = render(<MyRewardsScreen />);
    expect(getByTestId('reward-tab-active').props.accessibilityState?.selected).toBe(true);
  });

  it('tapping Watchlist switches the selected tab', async () => {
    const { getByText, getByTestId } = render(<MyRewardsScreen />);
    fireEvent.press(getByText('Watchlist'));
    await waitFor(() => {
      expect(getByTestId('reward-tab-watchlist').props.accessibilityState?.selected).toBe(true);
    });
  });

  it('Watchlist tab shows empty-state placeholder when no stores + no deals', async () => {
    const { getByText, findByText } = render(<MyRewardsScreen />);
    fireEvent.press(getByText('Watchlist'));
    expect(await findByText(/stores you follow/i)).toBeTruthy();
  });

  it('rewardsService.list is called with active|used|expired only (not watchlist)', async () => {
    const { getByText } = render(<MyRewardsScreen />);
    fireEvent.press(getByText('Used'));
    await waitFor(() => {
      expect(rewardsService.list).toHaveBeenCalledWith('used');
    });
    fireEvent.press(getByText('Watchlist'));
    // Watchlist should NOT trigger a rewards list fetch
    const calls = (rewardsService.list as jest.Mock).mock.calls;
    expect(calls.some((c) => c[0] === 'watchlist')).toBe(false);
  });
});
