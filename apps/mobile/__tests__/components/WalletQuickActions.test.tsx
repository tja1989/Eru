import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WalletQuickActions } from '@/components/WalletQuickActions';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

describe('<WalletQuickActions />', () => {
  it('renders 5 action buttons', () => {
    const { getAllByTestId } = render(<WalletQuickActions />);
    expect(getAllByTestId(/wallet-action-/)).toHaveLength(5);
  });

  it('renders exact PWA labels: Shop, Local Offers, Gift Cards, Recharge, Donate', () => {
    const { getByText } = render(<WalletQuickActions />);
    ['Shop', 'Local Offers', 'Gift Cards', 'Recharge', 'Donate'].forEach((label) => {
      expect(getByText(label)).toBeTruthy();
    });
  });

  it('tapping Gift Cards navigates to /redeem?type=giftcard', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push });
    const { getByText } = render(<WalletQuickActions />);
    fireEvent.press(getByText('Gift Cards'));
    expect(push).toHaveBeenCalledWith({ pathname: '/redeem', params: { type: 'giftcard' } });
  });
});
