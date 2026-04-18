import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OtpScreen from '@/app/(auth)/otp';
import { authService } from '@/services/authService';

jest.mock('@/services/authService', () => ({
  authService: {
    verifyOtpAndSignIn: jest.fn(),
    checkRegistered: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ setToken: jest.fn() }),
    setState: jest.fn(),
  },
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ phone: '+919876543210', verificationId: 'vid-1' }),
}));

describe('<OtpScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('on Verify, calls authService.verifyOtpAndSignIn with concatenated digits', async () => {
    (authService.verifyOtpAndSignIn as jest.Mock).mockResolvedValue('id-token-xyz');
    (authService.checkRegistered as jest.Mock).mockResolvedValue(true);
    const { getByTestId, getAllByTestId } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '274816'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    await waitFor(() => {
      expect(authService.verifyOtpAndSignIn).toHaveBeenCalledWith('vid-1', '274816');
    });
  });

  it('shows error when verification fails', async () => {
    (authService.verifyOtpAndSignIn as jest.Mock).mockRejectedValue(new Error('invalid code'));
    const { getByTestId, getAllByTestId, findByText } = render(<OtpScreen />);
    const digits = getAllByTestId(/otp-digit-/);
    '000000'.split('').forEach((d, i) => fireEvent.changeText(digits[i], d));
    fireEvent.press(getByTestId('otp-verify'));

    expect(await findByText(/invalid code/i)).toBeTruthy();
  });
});
