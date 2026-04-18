import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MyRewardsScreen from '@/app/my-rewards/index';
import { rewardsService } from '@/services/rewardsService';

jest.mock('@/services/rewardsService');

const sample = (overrides: Partial<any> = {}) => ({
  id: 'r1',
  claimCode: 'ERU-AB12',
  status: 'active',
  pointsSpent: 100,
  expiresAt: '2030-01-01T00:00:00Z',
  offer: {
    id: 'o1',
    type: 'giftcard',
    title: 'Amazon',
    pointsCost: 100,
    cashValue: 10,
    validUntil: '2030-01-01T00:00:00Z',
    business: null,
  },
  ...overrides,
});

describe('<MyRewardsScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rewardsService.list as jest.Mock).mockResolvedValue([sample()]);
  });

  it('renders filter tabs', async () => {
    const { findAllByText } = render(<MyRewardsScreen />);
    expect((await findAllByText(/active/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/used/i)).length).toBeGreaterThan(0);
    expect((await findAllByText(/expired/i)).length).toBeGreaterThan(0);
  });

  it('shows rewards from the service', async () => {
    const { findByText } = render(<MyRewardsScreen />);
    expect(await findByText('Amazon')).toBeTruthy();
  });

  it('requests a different status when a tab is pressed', async () => {
    const { findByText, getByText } = render(<MyRewardsScreen />);
    await findByText('Amazon');
    fireEvent.press(getByText(/used/i));
    await waitFor(() => {
      expect(rewardsService.list).toHaveBeenLastCalledWith('used');
    });
  });
});
