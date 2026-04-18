import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OfferCard } from '@/components/OfferCard';

describe('<OfferCard />', () => {
  const offer = {
    id: 'o1',
    type: 'local' as const,
    title: '20% off cakes',
    description: 'Valid Fri-Sun',
    pointsCost: 200,
    cashValue: 50,
    imageUrl: null,
    validUntil: '2027-01-01T00:00:00Z',
    business: { id: 'b1', name: 'Kashi Bakes', pincode: '682016' },
  };

  it('renders title, points cost and business name', () => {
    const { getByText } = render(<OfferCard offer={offer} onClaim={jest.fn()} />);
    expect(getByText('20% off cakes')).toBeTruthy();
    expect(getByText(/200/)).toBeTruthy();
    expect(getByText('Kashi Bakes', { exact: false })).toBeTruthy();
  });

  it('calls onClaim with the offer id when Claim tapped', () => {
    const onClaim = jest.fn();
    const { getByText } = render(<OfferCard offer={offer} onClaim={onClaim} />);
    fireEvent.press(getByText(/claim/i));
    expect(onClaim).toHaveBeenCalledWith('o1');
  });

  it('shows "Claimed" state after prop flips', () => {
    const { getByText, rerender } = render(<OfferCard offer={offer} claimed={false} onClaim={jest.fn()} />);
    expect(getByText(/claim/i)).toBeTruthy();
    rerender(<OfferCard offer={offer} claimed={true} onClaim={jest.fn()} />);
    expect(getByText(/claimed/i)).toBeTruthy();
  });
});
