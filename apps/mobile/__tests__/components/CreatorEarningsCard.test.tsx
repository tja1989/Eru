import React from 'react';
import { render } from '@testing-library/react-native';
import { CreatorEarningsCard } from '@/components/CreatorEarningsCard';
import { sponsorshipService } from '@/services/sponsorshipService';

jest.mock('@/services/sponsorshipService');

describe('<CreatorEarningsCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders totalEarnings formatted as rupees', async () => {
    (sponsorshipService.getDashboard as jest.Mock).mockResolvedValue({
      totalEarnings: 2850, activeCount: 2, pendingCount: 1, completedCount: 4, active: [], pending: [],
    });
    const { findByText } = render(<CreatorEarningsCard />);
    expect(await findByText(/2,?850/)).toBeTruthy();
  });

  it('renders "No sponsored earnings yet" when totalEarnings is 0', async () => {
    (sponsorshipService.getDashboard as jest.Mock).mockResolvedValue({
      totalEarnings: 0, activeCount: 0, pendingCount: 0, completedCount: 0, active: [], pending: [],
    });
    const { findByText } = render(<CreatorEarningsCard />);
    expect(await findByText(/no sponsored earnings yet/i)).toBeTruthy();
  });
});
