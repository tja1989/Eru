import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WatchlistDealCard } from '@/components/WatchlistDealCard';

const deal = {
  id: 'o1',
  title: '20% off cakes',
  description: 'Weekend special',
  imageUrl: null,
  pointsCost: 200,
  cashValue: 50,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date().toISOString(),
  businessId: 'b1',
  businessName: 'Kashi Bakes',
  businessAvatarUrl: null,
  businessCategory: 'bakery',
  businessPincode: '682016',
};

describe('<WatchlistDealCard />', () => {
  it('renders deal title + business name', () => {
    const { getByText } = render(<WatchlistDealCard deal={deal} onClaim={jest.fn()} />);
    expect(getByText('20% off cakes')).toBeTruthy();
    expect(getByText('Kashi Bakes')).toBeTruthy();
  });

  it('renders pointsCost with 🪙 prefix', () => {
    const { getByText } = render(<WatchlistDealCard deal={deal} onClaim={jest.fn()} />);
    expect(getByText(/🪙 200/)).toBeTruthy();
  });

  it('renders a Claim button that fires onClaim(id)', () => {
    const onClaim = jest.fn();
    const { getByRole } = render(<WatchlistDealCard deal={deal} onClaim={onClaim} />);
    fireEvent.press(getByRole('button', { name: /Claim/i }));
    expect(onClaim).toHaveBeenCalledWith('o1');
  });

  it('renders a "✓ Followed" badge for watchlist context', () => {
    const { getByText } = render(<WatchlistDealCard deal={deal} onClaim={jest.fn()} />);
    expect(getByText(/✓ Followed/i)).toBeTruthy();
  });
});
