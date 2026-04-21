import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RedeemScreen from '@/app/redeem/index';
import { offersService } from '@/services/offersService';

jest.mock('@/services/offersService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: Object.assign(
    () => ({ balance: 500, refreshSummary: jest.fn() }),
    { getState: () => ({ balance: 500, refreshSummary: jest.fn() }) },
  ),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('<RedeemScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Local offers appear in the "Hot Deals Near You" carousel. Gift-card
    // tiles are hardcoded (Amazon/Flipkart/...) and don't come from the API.
    (offersService.list as jest.Mock).mockResolvedValue([
      { id: 'o1', type: 'local', title: 'Local A', pointsCost: 100, cashValue: 20, validUntil: 'z', business: null, description: null, imageUrl: null },
    ]);
  });

  it('renders category tabs', async () => {
    const { findAllByText } = render(<RedeemScreen />);
    expect((await findAllByText(/all/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/local/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/gift cards/i)).length).toBeGreaterThan(0);
  });

  it('shows Hot Deals offers from the service', async () => {
    const { findByText } = render(<RedeemScreen />);
    expect(await findByText('Local A')).toBeTruthy();
  });

  it('filters by category when tab pressed', async () => {
    const { findByText, getByText } = render(<RedeemScreen />);
    await findByText('Local A');
    // The "🎁 Gift Cards" label appears twice (tab + section) on All tab —
    // tapping tab-giftcard testID is the reliable way to switch.
    const { getByTestId } = render(<RedeemScreen />);
    fireEvent.press(getByTestId('tab-giftcard'));
    await waitFor(() => {
      expect(offersService.list).toHaveBeenLastCalledWith('giftcard');
    });
  });

  it('calls claim when Claim is tapped on a hot-deal card', async () => {
    (offersService.claim as jest.Mock).mockResolvedValue({
      id: 'r1', claimCode: 'ERU-AB12', pointsSpent: 100, expiresAt: 'z', offer: { title: 'Local A' },
    });
    const { findByText, getAllByText } = render(<RedeemScreen />);
    await findByText('Local A');
    fireEvent.press(getAllByText(/claim/i)[0]);
    await waitFor(() => {
      expect(offersService.claim).toHaveBeenCalled();
    });
  });
});
