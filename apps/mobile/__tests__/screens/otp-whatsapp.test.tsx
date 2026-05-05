import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpScreen from '@/app/(auth)/otp';
import { whatsappAuthService } from '@/services/whatsappAuthService';
import { authService } from '@/services/authService';
import { signInWithCustomToken } from '@/services/firebase';
import { getPendingConfirmation } from '@/services/pendingConfirmation';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/services/whatsappAuthService', () => ({
  whatsappAuthService: {
    send: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('@/services/authService', () => ({
  authService: {
    checkRegistered: jest.fn(),
    getOnboardingStatus: jest.fn().mockResolvedValue({ complete: true }),
    autoRegister: jest.fn(),
  },
}));

jest.mock('@/services/firebase', () => ({
  signInWithPhoneNumber: jest.fn(),
  signInWithCustomToken: jest.fn(),
  isFirebaseConfigured: () => true,
  getCurrentUserIdToken: jest.fn(),
  firebaseSignOut: jest.fn(),
}));

jest.mock('@/services/pendingConfirmation', () => ({
  getPendingConfirmation: jest.fn(),
  clearPendingConfirmation: jest.fn(),
  setPendingConfirmation: jest.fn(),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      setToken: jest.fn(),
      setOnboardingComplete: jest.fn(),
      setUser: jest.fn(),
      user: null,
    }),
    setState: jest.fn(),
  },
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: jest.fn(() => ({ phone: '+919876543210', channel: 'sms' })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function enterDigits(getAllByTestId: ReturnType<typeof render>['getAllByTestId'], code: string) {
  const digits = getAllByTestId(/otp-digit-/);
  code.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('<OtpScreen /> — WhatsApp channel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('when channel=whatsapp, submitting calls whatsappAuthService.verify then signInWithCustomToken', async () => {
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { uid: 'fb-uid-xyz', getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '123456');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(whatsappAuthService.verify).toHaveBeenCalledWith('+919876543210', '123456');
      expect(signInWithCustomToken).toHaveBeenCalledWith('custom-token-abc');
    });
  });

  it('when channel=whatsapp and registered + onboarding complete, navigates to /(tabs)', async () => {
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { uid: 'fb-uid-xyz', getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    (authService.getOnboardingStatus as jest.Mock).mockResolvedValue({ complete: true });

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '123456');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('when registered but onboarding NOT complete, navigates to /(auth)/personalize', async () => {
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { uid: 'fb-uid-xyz', getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    (authService.getOnboardingStatus as jest.Mock).mockResolvedValue({ complete: false });

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '123456');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/personalize');
    });
  });

  it('when channel=whatsapp and NOT registered, auto-registers then navigates to /(auth)/personalize', async () => {
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { uid: 'fb-uid-xyz', getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(false);
    (authService.autoRegister as jest.Mock).mockResolvedValue({ user: { id: 'u-1' } });

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '999999');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(authService.autoRegister).toHaveBeenCalledWith('fb-uid-xyz', '+919876543210');
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/personalize');
    });
  });

  it('when channel=sms (default), uses native confirmation.confirm and NOT whatsappAuthService', async () => {
    const mockConfirm = jest.fn().mockResolvedValue({
      user: { uid: 'fb-sms', getIdToken: jest.fn().mockResolvedValue('id-token-sms') },
    });
    (getPendingConfirmation as jest.Mock).mockReturnValue({ confirm: mockConfirm });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      channel: 'sms',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '274816');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalledWith('274816');
      expect(whatsappAuthService.verify).not.toHaveBeenCalled();
    });
  });
});
