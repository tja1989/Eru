import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Tutorial from '@/app/(auth)/tutorial';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

const mockSetOnboarding = jest.fn();
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: any) => any) =>
    sel({
      setOnboardingComplete: mockSetOnboarding,
      user: null,
      token: null,
      isAuthenticated: false,
    }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
}));

describe('<Tutorial /> (P5 F4 pixel parity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the 5 PWA earning category labels (lines 437-471)', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText('Consume Content')).toBeTruthy();
    expect(getByText('Engage')).toBeTruthy();
    expect(getByText('Give Opinions')).toBeTruthy();
    expect(getByText('Shop & Claim')).toBeTruthy();
    expect(getByText('Big Wins')).toBeTruthy();
  });

  it('shows the per-category daily caps (PWA copy)', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText('up to 170 pts/day')).toBeTruthy();
    expect(getByText('up to 140 pts/day')).toBeTruthy();
    expect(getByText('up to 200 pts/day')).toBeTruthy();
    expect(getByText('up to 130 pts/day')).toBeTruthy();
    expect(getByText('bonus boosts')).toBeTruthy();
  });

  it('renders the welcome bonus banner with +250 pts and ₹2.50 sub (PWA lines 427-432)', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText('WELCOME BONUS')).toBeTruthy();
    expect(getByText('+250')).toBeTruthy();
    expect(getByText(/₹2\.50.*already in your wallet/i)).toBeTruthy();
  });

  it('renders the Step 4 of 4 progress caption (PWA line 422)', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText(/Step 4 of 4.*193 pts\/day average/)).toBeTruthy();
  });

  it('renders the tier teaser line (PWA line 476)', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText(/Explorer 1\.0x.*Engager 1\.2x.*Influencer 1\.5x.*Champion 2\.0x/)).toBeTruthy();
  });

  it('renders the first-login footer hint (PWA line 479)', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText(/first login earns you \+25 pts/i)).toBeTruthy();
  });

  it('"Start Earning 🚀" CTA is present', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText(/Start Earning/)).toBeTruthy();
  });

  it('"Start Earning" calls setOnboardingComplete and navigates to /(tabs)', async () => {
    const replace = jest.fn();
    jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ push: jest.fn(), replace, back: jest.fn() });

    const { getByText } = render(<Tutorial />);
    fireEvent.press(getByText(/start earning/i));

    await waitFor(() => {
      expect(mockSetOnboarding).toHaveBeenCalledWith(true);
      expect(replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('Skip in the header also routes to /(tabs)', async () => {
    const replace = jest.fn();
    jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ push: jest.fn(), replace, back: jest.fn() });

    const { getByLabelText } = render(<Tutorial />);
    fireEvent.press(getByLabelText('Skip'));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
