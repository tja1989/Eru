import React from 'react';
import { render } from '@testing-library/react-native';
import BadgesScreen from '@/app/badges/index';
import { badgesService } from '@/services/badgesService';

jest.mock('@/services/badgesService');

describe('<BadgesScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (badgesService.list as jest.Mock).mockResolvedValue([
      { id: 'b1', code: 'a', title: 'Seven days', description: 'Streak', emoji: '🔥', unlockedAt: '2026-04-18' },
      { id: 'b2', code: 'b', title: 'First buy', description: 'Purchase', emoji: '🛍️', unlockedAt: null },
    ]);
  });

  it('fetches badges on mount and shows X/Y unlocked counter', async () => {
    const { findByText } = render(<BadgesScreen />);
    expect(await findByText(/1\/2 unlocked/i)).toBeTruthy();
  });

  it('renders a BadgeGrid with the fetched badges', async () => {
    const { findByTestId } = render(<BadgesScreen />);
    expect(await findByTestId('badge-a')).toBeTruthy();
    expect(await findByTestId('badge-b')).toBeTruthy();
  });
});
