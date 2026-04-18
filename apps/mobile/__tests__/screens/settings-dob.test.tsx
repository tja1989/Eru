import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SettingsScreen from '@/app/settings/index';
import { userService } from '@/services/userService';

// Mock the native date picker as a simple string component
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('@/services/userService', () => ({
  userService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'u-1', name: 'Test User', username: 'testuser', phone: '+91999' },
    logout: jest.fn(),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn() }),
}));

const baseSettings = {
  name: 'Test User',
  bio: '',
  pincode: '',
  pushNotifications: true,
  privateAccount: false,
  shareDataWithBrands: true,
  dob: null,
};

describe('<SettingsScreen /> — DOB picker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getSettings as jest.Mock).mockResolvedValue(baseSettings);
    (userService.updateSettings as jest.Mock).mockResolvedValue({});
  });

  it('renders a "Date of Birth" row', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Date of Birth')).toBeTruthy();
  });

  it('shows "Not set" when dob is null', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Not set')).toBeTruthy();
  });

  it('shows formatted date when dob is set', async () => {
    (userService.getSettings as jest.Mock).mockResolvedValue({
      ...baseSettings,
      dob: '1990-01-15',
    });
    const { findByText } = render(<SettingsScreen />);
    // Should render something like "15 Jan 1990"
    expect(await findByText('15 Jan 1990')).toBeTruthy();
  });

  it('tapping DOB row opens the date picker', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    await findByText('Date of Birth');
    const dobRow = await findByTestId('dob-row');
    await act(async () => {
      fireEvent.press(dobRow);
    });
    // Picker should be visible
    expect(await findByTestId('dob-picker')).toBeTruthy();
  });

  it('selecting a date calls updateSettings with dob in ISO format on Save', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    await findByText('Date of Birth');

    // Open picker
    const dobRow = await findByTestId('dob-row');
    await act(async () => {
      fireEvent.press(dobRow);
    });

    // Simulate date selection from picker (DateTimePicker onChange event)
    const picker = await findByTestId('dob-picker');
    const selectedDate = new Date('1995-06-20T00:00:00.000Z');
    await act(async () => {
      fireEvent(picker, 'onChange', { nativeEvent: {} }, selectedDate);
    });

    // Press Save
    const saveBtn = await findByText('Save');
    await act(async () => {
      fireEvent.press(saveBtn);
    });

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ dob: '1995-06-20' }),
      );
    });
  });

  it('dismissing picker without selecting does not save dob', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    await findByText('Date of Birth');

    const dobRow = await findByTestId('dob-row');
    await act(async () => {
      fireEvent.press(dobRow);
    });

    // Simulate cancel (onChange with null date — how datetimepicker signals dismiss)
    const picker = await findByTestId('dob-picker');
    await act(async () => {
      fireEvent(picker, 'onChange', { nativeEvent: {} }, undefined);
    });

    // Picker should close, updateSettings not called
    expect(userService.updateSettings).not.toHaveBeenCalled();
  });
});
