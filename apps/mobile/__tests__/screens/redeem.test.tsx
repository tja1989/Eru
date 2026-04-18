import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RedeemScreen from '@/app/redeem/index';
import { offersService } from '@/services/offersService';

jest.mock('@/services/offersService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: {
    getState: () => ({ balance: 500, refreshSummary: jest.fn() }),
  },
}));

describe('<RedeemScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (offersService.list as jest.Mock).mockResolvedValue([
      { id: 'o1', type: 'local', title: 'Local A', pointsCost: 100, cashValue: 20, validUntil: 'z', business: null, description: null, imageUrl: null },
      { id: 'o2', type: 'giftcard', title: 'Amazon', pointsCost: 1000, cashValue: 100, validUntil: 'z', business: null, description: null, imageUrl: null },
    ]);
  });

  it('renders category tabs', async () => {
    const { findAllByText } = render(<RedeemScreen />);
    expect((await findAllByText(/all/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/local/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/gift cards/i)).length).toBeGreaterThan(0);
  });

  it('shows offers from the service', async () => {
    const { findByText } = render(<RedeemScreen />);
    expect(await findByText('Local A')).toBeTruthy();
    expect(await findByText('Amazon')).toBeTruthy();
  });

  it('filters by category when tab pressed', async () => {
    const { findByText, getByText } = render(<RedeemScreen />);
    await findByText('Amazon');
    fireEvent.press(getByText(/gift cards/i));
    await waitFor(() => {
      expect(offersService.list).toHaveBeenLastCalledWith('giftcard');
    });
  });

  it('calls claim when Claim is tapped and shows the claim code', async () => {
    (offersService.claim as jest.Mock).mockResolvedValue({
      id: 'r1', claimCode: 'ERU-AB12', pointsSpent: 100, expiresAt: 'z', offer: { title: 'Local A' },
    });
    const { findByText, getAllByText } = render(<RedeemScreen />);
    await findByText('Local A');
    fireEvent.press(getAllByText(/claim/i)[0]);
    expect(await findByText(/ERU-AB12/)).toBeTruthy();
  });
});
