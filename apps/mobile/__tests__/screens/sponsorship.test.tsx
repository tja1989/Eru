import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SponsorshipDashboardScreen from '@/app/sponsorship/index';
import { sponsorshipService } from '@/services/sponsorshipService';

jest.mock('@/services/sponsorshipService');

const pendingProposal = {
  id: 'p1',
  businessId: 'b1',
  creatorId: 'c1',
  contentId: null,
  boostAmount: '1000',
  commissionPct: '20',
  creatorEarnings: '0',
  status: 'pending' as const,
  reach: 0,
  clicks: 0,
  boostSpent: '0',
  acceptedAt: null,
  business: { id: 'b1', name: 'Kashi Bakes' },
  content: null,
};

const activeProposal = {
  ...pendingProposal,
  id: 'p2',
  status: 'active' as const,
  business: { id: 'b2', name: 'Chai Point' },
};

describe('<SponsorshipDashboardScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sponsorshipService.getDashboard as jest.Mock).mockResolvedValue({
      activeCount: 1,
      pendingCount: 1,
      completedCount: 4,
      totalEarnings: 2850,
      active: [activeProposal],
      pending: [pendingProposal],
    });
    (sponsorshipService.accept as jest.Mock).mockResolvedValue({ ...pendingProposal, status: 'accepted' });
    (sponsorshipService.decline as jest.Mock).mockResolvedValue({ ...pendingProposal, status: 'declined' });
  });

  it('renders header stats from dashboard', async () => {
    const { findByText } = render(<SponsorshipDashboardScreen />);
    expect(await findByText('Active')).toBeTruthy();
    expect(await findByText('Pending')).toBeTruthy();
    expect(await findByText('Completed')).toBeTruthy();
    expect(await findByText(/2,?850/)).toBeTruthy();
  });

  it('renders pending proposals with SponsorshipCards', async () => {
    const { findByText } = render(<SponsorshipDashboardScreen />);
    expect(await findByText('Kashi Bakes')).toBeTruthy();
    expect(await findByText('Chai Point')).toBeTruthy();
  });

  it('tapping Accept on a pending proposal calls sponsorshipService.accept', async () => {
    const { findByText } = render(<SponsorshipDashboardScreen />);
    const acceptBtn = await findByText(/accept/i);
    fireEvent.press(acceptBtn);
    await waitFor(() => {
      expect(sponsorshipService.accept).toHaveBeenCalledWith('p1');
    });
  });
});
