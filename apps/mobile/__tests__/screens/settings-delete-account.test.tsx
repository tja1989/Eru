import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '@/app/settings/index';
import { userService } from '@/services/userService';

// Mock native date picker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

const mockReset = jest.fn();
const mockReplace = jest.fn();

jest.mock('@/services/userService', () => ({
  userService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    deleteMe: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'u-1',
      name: 'Test User',
      username: 'testuser',
      phone: '+919876543210',
    },
    logout: jest.fn(),
    reset: mockReset,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));

const baseSettings = {
  name: 'Test User',
  bio: '',
  pincode: '',
  pushNotifications: true,
  privateAccount: false,
  shareDataWithBrands: true,
  dob: null,
  gender: null,
  secondaryPincodes: [],
  notificationEmail: false,
};

describe('<SettingsScreen /> — F10.6 Delete Account', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getSettings as jest.Mock).mockResolvedValue(baseSettings);
    (userService.updateSettings as jest.Mock).mockResolvedValue({});
    (userService.deleteMe as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders a "Delete Account" button', async () => {
    const { findByTestId } = render(<SettingsScreen />);
    expect(await findByTestId('delete-account-btn')).toBeTruthy();
  });

  it('tapping Cancel in the alert does NOT call deleteMe', async () => {
    // Intercept Alert.alert and simulate pressing "Cancel"
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons) => {
      const cancel = buttons?.find((b) => b.text === 'Cancel');
      cancel?.onPress?.();
    });

    const { findByTestId } = render(<SettingsScreen />);
    const btn = await findByTestId('delete-account-btn');

    await act(async () => {
      fireEvent.press(btn);
    });

    expect(userService.deleteMe).not.toHaveBeenCalled();
  });

  it('confirming Delete calls deleteMe, then reset, then router.replace to welcome', async () => {
    // Intercept Alert.alert and simulate pressing "Delete"
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons) => {
      const deleteBtn = buttons?.find((b) => b.text === 'Delete');
      deleteBtn?.onPress?.();
    });

    const { findByTestId } = render(<SettingsScreen />);
    const btn = await findByTestId('delete-account-btn');

    await act(async () => {
      fireEvent.press(btn);
    });

    await waitFor(() => {
      expect(userService.deleteMe).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('/(auth)/welcome');
    });
  });
});
