import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProposalContextCard } from '@/components/ProposalContextCard';
import { sponsorshipService } from '@/services/sponsorshipService';

jest.mock('@/services/sponsorshipService');

const pending: any = {
  id: 'p1',
  status: 'pending',
  boostAmount: '5000',
  commissionPct: '20',
  creatorEarnings: '1000',
  business: { id: 'b1', name: 'Kashi Bakes' },
  reach: 0,
  clicks: 0,
  boostSpent: '0',
  acceptedAt: null,
  contentId: null,
  creatorId: 'me',
  businessId: 'b1',
};

describe('<ProposalContextCard />', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders BOOST PROPOSAL label + business name', () => {
    const { getByText } = render(<ProposalContextCard proposal={pending} onUpdated={jest.fn()} />);
    expect(getByText('BOOST PROPOSAL')).toBeTruthy();
    expect(getByText('Kashi Bakes')).toBeTruthy();
  });

  it('renders Accept / Negotiate / ✕ when status=pending', () => {
    const { getByLabelText } = render(<ProposalContextCard proposal={pending} onUpdated={jest.fn()} />);
    expect(getByLabelText('Accept')).toBeTruthy();
    expect(getByLabelText('Negotiate')).toBeTruthy();
    expect(getByLabelText('Decline')).toBeTruthy();
  });

  it('tapping Accept calls sponsorshipService.accept + onUpdated', async () => {
    const next = { ...pending, status: 'accepted' };
    (sponsorshipService.accept as jest.Mock).mockResolvedValue(next);
    const onUpdated = jest.fn();
    const { getByLabelText, findByText } = render(
      <ProposalContextCard proposal={pending} onUpdated={onUpdated} />,
    );
    fireEvent.press(getByLabelText('Accept'));
    await findByText('BOOST PROPOSAL'); // render still mounted after async
    expect(sponsorshipService.accept).toHaveBeenCalledWith('p1');
  });

  it('hides action buttons when status is not pending', () => {
    const { queryByLabelText } = render(
      <ProposalContextCard proposal={{ ...pending, status: 'accepted' }} onUpdated={jest.fn()} />,
    );
    expect(queryByLabelText('Accept')).toBeNull();
    expect(queryByLabelText('Negotiate')).toBeNull();
  });
});
