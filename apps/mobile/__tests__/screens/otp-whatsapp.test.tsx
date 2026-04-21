import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpScreen from '@/app/(auth)/otp';
import { whatsappAuthService } from '@/services/whatsappAuthService';
import { authService } from '@/services/authService';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/services/whatsappAuthService', () => ({
  whatsappAuthService: {
    send: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('@/services/authService', () => ({
  authService: {
    verifyOtpAndSignIn: jest.fn(),
    checkRegistered: jest.fn(),
    getOnboardingStatus: jest.fn().mockResolvedValue({ complete: true }),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      setToken: jest.fn(),
      setOnboardingComplete: jest.fn(),
    }),
    setState: jest.fn(),
  },
}));

const mockReplace = jest.fn();
const mockPush = jest.fn();

// useLocalSearchParams is overridden per-test via jest.spyOn
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useLocalSearchParams: jest.fn(() => ({
    phone: '+919876543210',
    verificationId: 'vid-1',
    channel: 'sms',
  })),
}));

// Mock firebase/auth for signInWithCustomToken
jest.mock('firebase/auth', () => ({
  signInWithCustomToken: jest.fn(),
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
    const { signInWithCustomToken } = require('firebase/auth');
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      verificationId: '',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '123456');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(whatsappAuthService.verify).toHaveBeenCalledWith('+919876543210', '123456');
      expect(signInWithCustomToken).toHaveBeenCalledWith(expect.anything(), 'custom-token-abc');
    });
  });

  it('when channel=whatsapp and registered + onboarding complete, navigates to /(tabs)', async () => {
    const { signInWithCustomToken } = require('firebase/auth');
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    (authService.getOnboardingStatus as jest.Mock).mockResolvedValue({ complete: true });

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      verificationId: '',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '123456');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('when registered but onboarding NOT complete, navigates to /(auth)/tutorial', async () => {
    const { signInWithCustomToken } = require('firebase/auth');
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    (authService.getOnboardingStatus as jest.Mock).mockResolvedValue({ complete: false });

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      verificationId: '',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '123456');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/tutorial');
    });
  });

  it('when channel=whatsapp and NOT registered, navigates to onboarding', async () => {
    const { signInWithCustomToken } = require('firebase/auth');
    (whatsappAuthService.verify as jest.Mock).mockResolvedValue('custom-token-abc');
    (signInWithCustomToken as jest.Mock).mockResolvedValue({
      user: { getIdToken: jest.fn().mockResolvedValue('id-token-xyz') },
    });
    (authService.checkRegistered as jest.Mock).mockResolvedValue(false);

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      verificationId: '',
      channel: 'whatsapp',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '999999');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/(auth)/onboarding' }),
      );
    });
  });

  it('when channel=sms (default), uses authService.verifyOtpAndSignIn and NOT whatsappAuthService', async () => {
    (authService.verifyOtpAndSignIn as jest.Mock).mockResolvedValue('id-token-sms');
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);

    const { useLocalSearchParams } = require('expo-router');
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      phone: '+919876543210',
      verificationId: 'vid-1',
      channel: 'sms',
    });

    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    enterDigits(getAllByTestId, '274816');
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(authService.verifyOtpAndSignIn).toHaveBeenCalledWith('vid-1', '274816');
      expect(whatsappAuthService.verify).not.toHaveBeenCalled();
    });
  });
});
