import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpScreen from '@/app/(auth)/otp';
import { authService } from '@/services/authService';
import { getPendingConfirmation } from '@/services/pendingConfirmation';

jest.mock('@/services/authService', () => ({
  authService: {
    checkRegistered: jest.fn(),
    getOnboardingStatus: jest.fn(),
  },
}));

jest.mock('@/services/whatsappAuthService', () => ({
  whatsappAuthService: {
    send: jest.fn(),
    verify: jest.fn(),
  },
}));

// Native Firebase SDK: the ConfirmationResult is held in a module-level ref,
// so we mock that module and have it return a fake confirmation with `.confirm`.
const mockConfirm = jest.fn();
jest.mock('@/services/pendingConfirmation', () => ({
  getPendingConfirmation: jest.fn(),
  clearPendingConfirmation: jest.fn(),
  setPendingConfirmation: jest.fn(),
}));

jest.mock('@/services/firebase', () => ({
  signInWithPhoneNumber: jest.fn(),
  signInWithCustomToken: jest.fn(),
  isFirebaseConfigured: () => true,
  getCurrentUserIdToken: jest.fn(),
  firebaseSignOut: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ setToken: jest.fn(), setOnboardingComplete: jest.fn() }),
    setState: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ phone: '+919876543210' }),
}));

describe('<OtpScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReset();
  });

  it('renders six OTP digit inputs', () => {
    const { getAllByTestId } = render(<OtpScreen />);
    expect(getAllByTestId(/otp-digit-/)).toHaveLength(6);
  });

  it('the Verify button is disabled until all 6 digits are entered', () => {
    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);

    expect(getByTestId('otp-verify').props.accessibilityState?.disabled).toBe(true);

    for (let i = 0; i < 5; i++) fireEvent.changeText(digits[i], String(i));
    expect(getByTestId('otp-verify').props.accessibilityState?.disabled).toBe(true);

    fireEvent.changeText(digits[5], '9');
    expect(getByTestId('otp-verify').props.accessibilityState?.disabled).toBe(false);
  });

  it('on Verify, calls confirmation.confirm with concatenated digits', async () => {
    const fakeUserCred = {
      user: { uid: 'fb-uid-xyz', getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    };
    mockConfirm.mockResolvedValue(fakeUserCred);
    (getPendingConfirmation as jest.Mock).mockReturnValue({ confirm: mockConfirm });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    (authService.getOnboardingStatus as jest.Mock).mockResolvedValue({ complete: true });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '274816'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('274816');
    });
  });

  it('shows error when verification fails', async () => {
    mockConfirm.mockRejectedValue(new Error('invalid code'));
    (getPendingConfirmation as jest.Mock).mockReturnValue({ confirm: mockConfirm });

    const { getByTestId, getAllByTestId, findByText } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '000000'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    expect(await findByText(/invalid code/i)).toBeTruthy();
  });

  it('shows error when the pending confirmation is missing (session expired)', async () => {
    (getPendingConfirmation as jest.Mock).mockReturnValue(null);

    const { getByTestId, getAllByTestId, findByText } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '111111'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    expect(await findByText(/Session expired/i)).toBeTruthy();
  });

  // ─────────────── P5 F2 pixel-parity additions ───────────────
  it('renders the "Verify Phone" header title (PWA line 297)', () => {
    const { getByText } = render(<OtpScreen />);
    expect(getByText('Verify Phone')).toBeTruthy();
  });

  it('shows the 4-step progress bar with Step 1 of 4 caption (PWA lines 301-308)', () => {
    const { getByText, getAllByTestId } = render(<OtpScreen />);
    expect(getByText(/Step 1 of 4/)).toBeTruthy();
    expect(getAllByTestId(/^progress-seg-/)).toHaveLength(4);
  });

  it('shows the resend countdown ("Resend in 30s") on first render (PWA line 332)', () => {
    const { getByText } = render(<OtpScreen />);
    expect(getByText(/Resend in 30s/)).toBeTruthy();
  });

  it('renders the legal disclosure mentioning Terms and Privacy Policy (PWA line 335)', () => {
    const { getByText } = render(<OtpScreen />);
    expect(getByText(/By continuing you agree/i)).toBeTruthy();
    expect(getByText('Terms')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('CTA button reads "Verify & Continue →" (PWA line 334)', () => {
    const { getByText } = render(<OtpScreen />);
    expect(getByText(/Verify & Continue/)).toBeTruthy();
  });
});
