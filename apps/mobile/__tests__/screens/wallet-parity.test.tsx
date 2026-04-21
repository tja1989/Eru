import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import WalletScreen from '@/app/wallet/index';
import { walletService } from '@/services/walletService';

jest.mock('@/services/walletService');
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ balance: 4820, dailyEarned: 145, dailyGoal: 250 }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

describe('<WalletScreen /> — PWA parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (walletService.getWallet as jest.Mock).mockResolvedValue({
      balance: 4820,
      rupeeValue: 48.20,
      dailyEarned: 145,
      dailyGoal: 250,
      pointsToGoal: 105,
      dailyGoalHintCopy: '105 pts to daily goal!',
      streak: 24,
      currentTier: 'influencer',
      nextTier: 'champion',
      pointsToNext: 4820,
      lifetimePoints: 45180,
      expiringPoints: 320,
      expiringDays: 12,
    });
    (walletService.getHistory as jest.Mock).mockResolvedValue({ data: [], total: 0 });
  });

  it('header reads "Eru Wallet"', async () => {
    const { findByText } = render(<WalletScreen />);
    expect(await findByText(/Eru Wallet/i)).toBeTruthy();
  });

  it('renders the daily goal hint copy from the API', async () => {
    const { findByText } = render(<WalletScreen />);
    expect(await findByText(/105 pts to daily goal/i)).toBeTruthy();
  });

  it('renders 🔥 {streak}-day streak label', async () => {
    const { findByText } = render(<WalletScreen />);
    expect(await findByText(/🔥 24-day streak/i)).toBeTruthy();
  });

  it('renders WalletQuickActions inside the balance card', async () => {
    const { findAllByTestId } = render(<WalletScreen />);
    const actions = await findAllByTestId(/wallet-action-/);
    expect(actions).toHaveLength(5);
  });

  it('renders the expiry warning when expiringPoints > 0', async () => {
    const { findByText } = render(<WalletScreen />);
    expect(await findByText(/320 pts expiring in 12 days/i)).toBeTruthy();
  });
});
