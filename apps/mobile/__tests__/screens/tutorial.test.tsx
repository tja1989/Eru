import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Tutorial from '@/app/(auth)/tutorial';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
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

describe('<Tutorial />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders 5 earning category cards', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText('Browse & Engage')).toBeTruthy();
    expect(getByText('Create Content')).toBeTruthy();
    expect(getByText('Daily Streaks')).toBeTruthy();
    expect(getByText('Quests')).toBeTruthy();
    expect(getByText('Trade-In')).toBeTruthy();
  });

  it('cards start collapsed (bullet points not visible)', () => {
    const { queryByTestId } = render(<Tutorial />);
    expect(queryByTestId('card-bullets-0')).toBeNull();
    expect(queryByTestId('card-bullets-1')).toBeNull();
  });

  it('tapping a card expands it to show bullet points', () => {
    const { getByText, getByTestId } = render(<Tutorial />);
    fireEvent.press(getByText('Browse & Engage'));
    expect(getByTestId('card-bullets-0')).toBeTruthy();
  });

  it('welcome bonus banner "+250 pts" is visible', () => {
    const { getByText } = render(<Tutorial />);
    expect(getByText(/\+250 pts/)).toBeTruthy();
  });

  it('"Start Earning" calls setOnboardingComplete and navigates to /(tabs)', async () => {
    const replace = jest.fn();
    jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ push: jest.fn(), replace });

    const { getByText } = render(<Tutorial />);
    fireEvent.press(getByText(/start earning/i));

    await waitFor(() => {
      expect(mockSetOnboarding).toHaveBeenCalledWith(true);
      expect(replace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
