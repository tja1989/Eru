import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SponsorshipCard } from '@/components/SponsorshipCard';
import type { Proposal } from '@/services/sponsorshipService';

const baseProposal: Proposal = {
  id: 'prop-1',
  businessId: 'biz-1',
  creatorId: 'creator-1',
  contentId: null,
  boostAmount: '1000',
  commissionPct: '20',
  creatorEarnings: '200',
  status: 'pending',
  reach: 5000,
  clicks: 320,
  boostSpent: '500',
  acceptedAt: null,
  business: { id: 'biz-1', name: 'Kashi Bakes' },
  content: null,
};

describe('<SponsorshipCard />', () => {
  it('renders the business name', () => {
    const { getByText } = render(<SponsorshipCard proposal={baseProposal} />);
    expect(getByText('Kashi Bakes')).toBeTruthy();
  });

  it('renders a LIVE status badge when status is active', () => {
    const active: Proposal = { ...baseProposal, status: 'active' };
    const { getByText } = render(<SponsorshipCard proposal={active} />);
    expect(getByText(/live/i)).toBeTruthy();
  });

  it('shows Accept and Decline buttons for pending proposals and fires callbacks', () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const { getByText } = render(
      <SponsorshipCard proposal={baseProposal} onAccept={onAccept} onDecline={onDecline} />,
    );
    fireEvent.press(getByText(/accept/i));
    fireEvent.press(getByText(/decline/i));
    expect(onAccept).toHaveBeenCalledWith('prop-1');
    expect(onDecline).toHaveBeenCalledWith('prop-1');
  });
});
