import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GiftCardTile } from '@/components/GiftCardTile';

describe('<GiftCardTile />', () => {
  it('renders brand name + "From N pts" subtext', () => {
    const { getByText } = render(
      <GiftCardTile brand="Amazon" fromPoints={1000} color="#FF9900" emoji="🛒" onPress={jest.fn()} />,
    );
    expect(getByText('Amazon')).toBeTruthy();
    expect(getByText(/From 1,000 pts/i)).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <GiftCardTile brand="Amazon" fromPoints={1000} color="#FF9900" emoji="🛒" onPress={onPress} />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a11y label includes brand + from price', () => {
    const { getByLabelText } = render(
      <GiftCardTile brand="Swiggy" fromPoints={500} color="#FC8019" emoji="🍔" onPress={jest.fn()} />,
    );
    expect(getByLabelText(/Swiggy/i)).toBeTruthy();
  });
});
