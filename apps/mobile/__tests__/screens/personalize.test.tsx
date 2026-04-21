import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import Personalize from '@/app/(auth)/personalize';
import { INTERESTS, LANGUAGES } from '@eru/shared';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

describe('<Personalize /> (P5 F3 pixel parity)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all 15 PWA interest labels (lines 372-386)', async () => {
    const { getByText } = render(<Personalize />);
    await act(async () => {});
    INTERESTS.forEach((interest) => {
      expect(getByText(new RegExp(interest.label))).toBeTruthy();
    });
  });

  it('renders all 5 PWA language pills in PWA order (lines 395-399)', async () => {
    const { getAllByLabelText } = render(<Personalize />);
    await act(async () => {});
    const langPills = getAllByLabelText(/^lang-pill-/);
    const labels = langPills.map((p: any) => p.props.accessibilityLabel.replace('lang-pill-', ''));
    expect(labels).toEqual(LANGUAGES.map((l) => l.code));
  });

  it('shows Step 2 of 4 progress bar caption (PWA line 355)', async () => {
    const { getByText } = render(<Personalize />);
    await act(async () => {});
    expect(getByText(/Step 2 of 4/)).toBeTruthy();
  });

  it('Continue button stays disabled until 5+ interests (PWA spec)', async () => {
    const { getByLabelText, getByTestId } = render(<Personalize />);
    await act(async () => {});

    const continueBtn = getByTestId('continue-btn');
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);

    ['food', 'tech', 'travel', 'books'].forEach((key) =>
      fireEvent.press(getByLabelText(`interest-pill-${key}`)),
    );
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);

    fireEvent.press(getByLabelText('interest-pill-fitness'));
    expect(continueBtn.props.accessibilityState?.disabled).toBe(false);
  });

  it('shows the "+50 pts" bonus badge once 5 interests are selected (PWA line 388)', async () => {
    const { getByLabelText, queryByText } = render(<Personalize />);
    await act(async () => {});
    ['food', 'tech', 'travel', 'books', 'fitness'].forEach((key) =>
      fireEvent.press(getByLabelText(`interest-pill-${key}`)),
    );
    expect(queryByText(/\+50 pts/i)).toBeTruthy();
  });

  it('"+50 pts" stays visible when MORE than 5 are selected (5+ rule)', async () => {
    const { getByLabelText, queryByText } = render(<Personalize />);
    await act(async () => {});
    ['food', 'tech', 'travel', 'books', 'fitness', 'cinema'].forEach((key) =>
      fireEvent.press(getByLabelText(`interest-pill-${key}`)),
    );
    expect(queryByText(/\+50 pts/i)).toBeTruthy();
  });

  it('Skip button is present and routes to /(auth)/tutorial (PWA line 346)', async () => {
    const push = jest.fn();
    jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ push, replace: jest.fn() });

    const { getByText } = render(<Personalize />);
    await act(async () => {});

    fireEvent.press(getByText('Skip'));
    expect(push).toHaveBeenCalledWith('/(auth)/tutorial');
  });

  it('Continue navigates to /(auth)/tutorial when 5+ interests are selected', async () => {
    const push = jest.fn();
    jest
      .spyOn(require('expo-router'), 'useRouter')
      .mockReturnValue({ push, replace: jest.fn() });

    const { getByLabelText, getByTestId } = render(<Personalize />);
    await act(async () => {});

    ['food', 'tech', 'travel', 'books', 'fitness'].forEach((key) =>
      fireEvent.press(getByLabelText(`interest-pill-${key}`)),
    );
    fireEvent.press(getByTestId('continue-btn'));
    expect(push).toHaveBeenCalledWith('/(auth)/tutorial');
  });
});
