import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Welcome from '@/app/(auth)/welcome';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('<Welcome />', () => {
  it('renders the brand name and tagline', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/^Eru$/)).toBeTruthy();
    expect(getByText(/your attention has value/i)).toBeTruthy();
  });

  it('shows 3 value prop cards (Earn, Redeem, Create)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/earn/i)).toBeTruthy();
    expect(getByText(/redeem/i)).toBeTruthy();
    expect(getByText(/create/i)).toBeTruthy();
  });

  it('"Get Started" navigates to /(auth)/login', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn() });
    const { getByText } = render(<Welcome />);
    fireEvent.press(getByText(/get started/i));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });

  it('"I already have an account" navigates to /(auth)/login', () => {
    const push = jest.fn();
    jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push, replace: jest.fn() });
    const { getByText } = render(<Welcome />);
    fireEvent.press(getByText(/i already have an account/i));
    expect(push).toHaveBeenCalledWith('/(auth)/login');
  });
});
