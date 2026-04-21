import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Welcome from '@/app/(auth)/welcome';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('<Welcome />', () => {
  it('renders the brand E logo and headline (PWA lines 260-265)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText('E')).toBeTruthy();
    expect(getByText(/Your attention/)).toBeTruthy();
    expect(getByText('has value.')).toBeTruthy();
  });

  it('shows 3 value-prop card titles (PWA lines 272-280)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText('Earn real rewards')).toBeTruthy();
    expect(getByText('Redeem locally')).toBeTruthy();
    expect(getByText('Create & get paid')).toBeTruthy();
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

  // ─────────────── P5 F1 pixel-parity additions ───────────────
  it('renders the "Consume. Earn. Connect." tagline (PWA line 264)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/Consume\.\s+Earn\.\s+Connect\./i)).toBeTruthy();
  });

  it('renders the exact 3 value-prop titles + bodies (PWA lines 271-281)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText('Earn real rewards')).toBeTruthy();
    expect(getByText(/25 earning actions.*193 pts\/day avg\./i)).toBeTruthy();
    expect(getByText('Redeem locally')).toBeTruthy();
    expect(getByText(/500\+ partner stores.*Free coffee, discounts, gifts/i)).toBeTruthy();
    expect(getByText('Create & get paid')).toBeTruthy();
    expect(getByText(/Tag businesses.*20% commission.*boosted posts/i)).toBeTruthy();
  });

  it('renders the Made-in-Kerala + pincodes-live footer (PWA line 287)', () => {
    const { getByText } = render(<Welcome />);
    expect(getByText(/Made in Kerala.*500 pincodes live/i)).toBeTruthy();
  });
});
