import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import { whatsappAuthService } from '@/services/whatsappAuthService';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/services/whatsappAuthService', () => ({
  whatsappAuthService: {
    send: jest.fn(),
    verify: jest.fn(),
  },
}));

// Firebase is NOT configured in test env; login will use dev-bypass unless
// we test with whatsapp toggle ON (which bypasses Firebase entirely).
jest.mock('../../services/firebase', () => ({
  isFirebaseConfigured: jest.fn(() => false),
  getFirebaseAuth: jest.fn(),
  PhoneAuthProvider: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  setAuthToken: jest.fn(),
  default: { post: jest.fn(), get: jest.fn() },
}));

jest.mock('../../services/feedService', () => ({
  feedService: { getWalletSummary: jest.fn() },
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ setToken: jest.fn() }),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('<LoginScreen /> — WhatsApp toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the "Send via WhatsApp" toggle', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('whatsapp-toggle')).toBeTruthy();
  });

  it('toggle is OFF by default', () => {
    const { getByTestId } = render(<LoginScreen />);
    // React Native Switch value prop holds the current state
    const toggle = getByTestId('whatsapp-toggle');
    expect(toggle.props.value).toBe(false);
  });

  it('when toggle is ON, Continue calls whatsappAuthService.send and NOT Firebase', async () => {
    (whatsappAuthService.send as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(<LoginScreen />);

    // Enter a phone number
    fireEvent.changeText(getByTestId('phone-input'), '9876543210');

    // Turn the toggle on
    fireEvent(getByTestId('whatsapp-toggle'), 'valueChange', true);

    // Press Continue
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      expect(whatsappAuthService.send).toHaveBeenCalledWith('+919876543210');
    });

    // Should navigate to OTP with channel=whatsapp
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(auth)/otp',
        params: expect.objectContaining({ channel: 'whatsapp' }),
      }),
    );
  });

  it('when toggle is OFF, Continue does NOT call whatsappAuthService.send', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('phone-input'), '9876543210');
    // Toggle stays OFF (default)
    fireEvent.press(getByText('Continue'));

    await waitFor(() => {
      // dev-bypass path runs (Firebase not configured in tests)
      expect(whatsappAuthService.send).not.toHaveBeenCalled();
    });
  });
});
