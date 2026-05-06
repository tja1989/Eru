import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpScreen from '@/app/(auth)/otp';
import { authService } from '@/services/authService';
import { getPendingConfirmation } from '@/services/pendingConfirmation';

jest.mock('@/services/authService', () => ({
  authService: {
    checkRegistered: jest.fn(),
    getOnboardingStatus: jest.fn(),
    autoRegister: jest.fn(),
  },
}));

jest.mock('@/services/userService', () => ({
  userService: {
    getSettings: jest.fn(),
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

// Auth store mock — expose stable jest.fn refs for setToken/setUser/etc so
// tests can assert what the OTP flow wrote into the store. Without `setUser`
// here, returning-user tests cannot verify that store.user is hydrated and
// the loop-on-fresh-install regression slips through.
const mockSetToken = jest.fn();
const mockSetUser = jest.fn();
const mockSetOnboardingComplete = jest.fn();
const mockAuthState: { user: unknown } = { user: null };
jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      setToken: mockSetToken,
      setUser: mockSetUser,
      setOnboardingComplete: mockSetOnboardingComplete,
      get user() {
        return mockAuthState.user;
      },
    }),
    setState: jest.fn(),
  },
}));

const mockRouterReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockRouterReplace, back: jest.fn() }),
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

  // ─────────── Regression: returning-user fresh-install loop ───────────
  // Bug history: a returning user who clears app data loses store.user but
  // keeps a server-side account. checkRegistered only returns boolean, so
  // store.user stays null after OTP. The (tabs) layout then reads
  // useAuthStore((s) => s.user?.needsHandleChoice ?? true) — fail-safe fires
  // because user is null, redirecting to Personalize. Loop. Fix is to
  // hydrate store.user from /users/me/settings + onboarding-status before
  // routing.
  it('returning user fresh-install: hydrates store.user from server before routing to /(tabs)', async () => {
    const { userService } = require('@/services/userService');
    const fakeUserCred = {
      user: { uid: 'fb-uid-returning', getIdToken: jest.fn().mockResolvedValue('id-token-r') },
    };
    mockConfirm.mockResolvedValue(fakeUserCred);
    (getPendingConfirmation as jest.Mock).mockReturnValue({ confirm: mockConfirm });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    (authService.getOnboardingStatus as jest.Mock).mockResolvedValue({
      complete: true,
      needsHandleChoice: false,
    });
    (userService.getSettings as jest.Mock).mockResolvedValue({
      settings: {
        id: 'u-server',
        name: 'Returning User',
        username: 'returning_user',
        tier: 'explorer',
        currentBalance: 250,
        avatarUrl: null,
        lifetimePoints: 250,
      },
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '424242'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      // Without this assertion, the loop bug sneaks back in: an empty
      // store.user makes the (tabs) gate's needsHandleChoice fall back to
      // true via `?? true`, redirecting to Personalize. The fix MUST set a
      // user object including needsHandleChoice from the server.
      expect(mockSetUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'u-server',
          username: 'returning_user',
          needsHandleChoice: false,
        }),
      );
      expect(mockRouterReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });
});
