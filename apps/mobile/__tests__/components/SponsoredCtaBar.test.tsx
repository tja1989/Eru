import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SponsoredCtaBar } from '@/components/SponsoredCtaBar';

describe('<SponsoredCtaBar />', () => {
  it('renders "Claim Offer →" by default', () => {
    const { getByText } = render(<SponsoredCtaBar onPress={jest.fn()} />);
    expect(getByText(/Claim Offer/i)).toBeTruthy();
  });

  it('renders custom label when provided', () => {
    const { getByText } = render(<SponsoredCtaBar label="Shop Now" onPress={jest.fn()} />);
    expect(getByText(/Shop Now/i)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<SponsoredCtaBar onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
