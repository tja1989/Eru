import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import Personalize from '@/app/(auth)/personalize';
import { INTERESTS, LANGUAGES } from '@eru/shared';
import { userService } from '@/services/userService';
import { locationsService } from '@/services/locationsService';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), put: jest.fn() },
}));

jest.mock('@/services/userService', () => ({
  userService: {
    updateSettings: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/services/locationsService', () => ({
  locationsService: {
    search: jest.fn().mockResolvedValue([]),
  },
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
    const { getByText } = render(<Personalize />);
    await act(async () => {});

    fireEvent.press(getByText('Skip'));
    expect(mockPush).toHaveBeenCalledWith('/(auth)/tutorial');
  });

  it('Continue saves interests+languages via userService.updateSettings then replaces to /(auth)/tutorial', async () => {
    const { getByLabelText, getByTestId } = render(<Personalize />);
    await act(async () => {});

    ['food', 'tech', 'travel', 'books', 'fitness'].forEach((key) =>
      fireEvent.press(getByLabelText(`interest-pill-${key}`)),
    );
    fireEvent.press(getByTestId('continue-btn'));

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: expect.arrayContaining(['food', 'tech', 'travel', 'books', 'fitness']),
          contentLanguages: expect.arrayContaining(['en']),
        }),
      );
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/tutorial');
    });
  });

  it('still routes to /(auth)/tutorial even if updateSettings fails (non-blocking)', async () => {
    (userService.updateSettings as jest.Mock).mockRejectedValueOnce(new Error('network'));
    const { getByLabelText, getByTestId } = render(<Personalize />);
    await act(async () => {});

    ['food', 'tech', 'travel', 'books', 'fitness'].forEach((key) =>
      fireEvent.press(getByLabelText(`interest-pill-${key}`)),
    );
    fireEvent.press(getByTestId('continue-btn'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/tutorial');
    });
  });

  it('looks up the locality name via locationsService when a pincode is resolved', async () => {
    (locationsService.search as jest.Mock).mockResolvedValue([
      { pincode: '682016', area: 'Ernakulam Central', district: 'Ernakulam', state: 'Kerala' },
    ]);
    const Location = require('expo-location');
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValueOnce({
      coords: { latitude: 9.97, longitude: 76.28 },
    });
    (Location.reverseGeocodeAsync as jest.Mock).mockResolvedValueOnce([{ postalCode: '682016' }]);

    const { findByText } = render(<Personalize />);
    // The card text concatenates "682016 • Ernakulam Central" — match partially.
    expect(await findByText(/Ernakulam Central/)).toBeTruthy();
  });
});
