import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/(auth)/login';
import { whatsappAuthService } from '@/services/whatsappAuthService';
import { signInWithPhoneNumber } from '@/services/firebase';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('@/services/whatsappAuthService', () => ({
  whatsappAuthService: {
    send: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('@/services/firebase', () => ({
  __esModule: true,
  isFirebaseConfigured: jest.fn(() => true),
  signInWithPhoneNumber: jest.fn(),
  signInWithCustomToken: jest.fn(),
  getCurrentUserIdToken: jest.fn(),
  firebaseSignOut: jest.fn(),
}));

jest.mock('@/services/pendingConfirmation', () => ({
  __esModule: true,
  getPendingConfirmation: jest.fn(() => null),
  setPendingConfirmation: jest.fn(),
  clearPendingConfirmation: jest.fn(),
}));

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
}));

// ── Tests ──────────────────────────────────────────────────────────────────

describe('<LoginScreen /> — PWA-style phone entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the "Verify Phone" header, progress bar, title, and country pill', () => {
    const { getByText, getAllByTestId } = render(<LoginScreen />);
    expect(getByText('Verify Phone')).toBeTruthy();
    expect(getAllByTestId(/^progress-seg-/)).toHaveLength(4);
    expect(getByText(/Step 1 of 4/)).toBeTruthy();
    expect(getByText('Your mobile number')).toBeTruthy();
    expect(getByText("We'll send a one-time password to verify")).toBeTruthy();
    expect(getByText('+91')).toBeTruthy();
  });

  it('renders the "Send via WhatsApp" toggle card with sub-copy', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    expect(getByTestId('whatsapp-toggle')).toBeTruthy();
    expect(getByText('Send via WhatsApp')).toBeTruthy();
    expect(getByText('Faster delivery. No SMS needed.')).toBeTruthy();
  });

  it('toggle starts OFF (accessibilityState.checked=false)', () => {
    const { getByTestId } = render(<LoginScreen />);
    const toggle = getByTestId('whatsapp-toggle');
    expect(toggle.props.accessibilityState?.checked).toBe(false);
  });

  it('CTA reads "Verify & Continue →"', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText(/Verify & Continue/)).toBeTruthy();
  });

  it('renders the legal disclosure mentioning Terms and Privacy Policy', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText(/By continuing you agree/i)).toBeTruthy();
    expect(getByText('Terms')).toBeTruthy();
    expect(getByText('Privacy Policy')).toBeTruthy();
  });

  it('when toggle is ON, Continue calls whatsappAuthService.send and NOT Firebase', async () => {
    (whatsappAuthService.send as jest.Mock).mockResolvedValue(undefined);
    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('phone-input'), '9876543210');

    // Tap the toggle card to flip it ON.
    fireEvent.press(getByTestId('whatsapp-toggle'));

    fireEvent.press(getByText(/Verify & Continue/));

    await waitFor(() => {
      expect(whatsappAuthService.send).toHaveBeenCalledWith('+919876543210');
      expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/(auth)/otp',
        params: expect.objectContaining({ channel: 'whatsapp' }),
      }),
    );
  });

  it('when toggle is OFF (default), Continue calls Firebase signInWithPhoneNumber', async () => {
    (signInWithPhoneNumber as jest.Mock).mockResolvedValue({ confirm: jest.fn() });
    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('phone-input'), '9876543210');
    fireEvent.press(getByText(/Verify & Continue/));

    await waitFor(() => {
      expect(signInWithPhoneNumber).toHaveBeenCalledWith('+919876543210');
      expect(whatsappAuthService.send).not.toHaveBeenCalled();
    });
  });

  it('rejects phone numbers shorter than 10 digits', async () => {
    const alertSpy = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation();
    const { getByTestId, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByTestId('phone-input'), '98765');
    fireEvent.press(getByText(/Verify & Continue/));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/10-digit/));
    });
    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});
