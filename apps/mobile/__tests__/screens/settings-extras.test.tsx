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
    user: {
      id: 'u-1',
      name: 'Test User',
      username: 'testuser',
      phone: '+919876543210',
    },
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
  gender: null,
  secondaryPincodes: [],
  notificationEmail: false,
};

// ─── F10.2: Gender radio ──────────────────────────────────────────────────────

describe('<SettingsScreen /> — F10.2 Gender radio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getSettings as jest.Mock).mockResolvedValue(baseSettings);
    (userService.updateSettings as jest.Mock).mockResolvedValue({});
  });

  it('renders gender options: Male, Female, Other', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Male')).toBeTruthy();
    expect(await findByText('Female')).toBeTruthy();
    expect(await findByText('Other')).toBeTruthy();
  });

  it('selecting "Male" updates local state and enables Save', async () => {
    const { findByText, findByTestId } = render(<SettingsScreen />);
    await findByText('Male');

    await act(async () => {
      fireEvent.press(await findByTestId('gender-option-male'));
    });

    // Save button appears when there are changes
    expect(await findByText('Save')).toBeTruthy();
  });

  it('pressing Save calls updateSettings with { gender: "male" }', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    await findByText('Male');

    await act(async () => {
      fireEvent.press(await findByTestId('gender-option-male'));
    });

    await act(async () => {
      fireEvent.press(await findByText('Save'));
    });

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'male' }),
      );
    });
  });

  it('selecting "Female" updates local state', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    await findByText('Female');

    await act(async () => {
      fireEvent.press(await findByTestId('gender-option-female'));
    });

    await act(async () => {
      fireEvent.press(await findByText('Save'));
    });

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'female' }),
      );
    });
  });

  it('pre-selects gender loaded from API', async () => {
    (userService.getSettings as jest.Mock).mockResolvedValue({
      ...baseSettings,
      gender: 'other',
    });
    const { findByTestId } = render(<SettingsScreen />);
    // The "other" option should have a checked indicator
    expect(await findByTestId('gender-selected-other')).toBeTruthy();
  });
});

// ─── F10.3: Secondary pincodes ────────────────────────────────────────────────

describe('<SettingsScreen /> — F10.3 Secondary pincodes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getSettings as jest.Mock).mockResolvedValue(baseSettings);
    (userService.updateSettings as jest.Mock).mockResolvedValue({});
  });

  it('renders existing secondary pincodes as chips', async () => {
    (userService.getSettings as jest.Mock).mockResolvedValue({
      ...baseSettings,
      secondaryPincodes: ['110001', '400001'],
    });
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('110001')).toBeTruthy();
    expect(await findByText('400001')).toBeTruthy();
  });

  it('renders an "+ Add Pincode" input field', async () => {
    const { findByTestId } = render(<SettingsScreen />);
    expect(await findByTestId('secondary-pincode-input')).toBeTruthy();
  });

  it('adds a pincode chip when 6-digit code is entered and confirmed', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    const input = await findByTestId('secondary-pincode-input');

    await act(async () => {
      fireEvent.changeText(input, '560001');
    });
    await act(async () => {
      fireEvent(input, 'onSubmitEditing');
    });

    expect(await findByText('560001')).toBeTruthy();
  });

  it('removing a chip updates local state', async () => {
    (userService.getSettings as jest.Mock).mockResolvedValue({
      ...baseSettings,
      secondaryPincodes: ['110001'],
    });
    const { findByTestId, queryByText, findByText } = render(<SettingsScreen />);
    // Wait for load
    await findByText('110001');

    await act(async () => {
      fireEvent.press(await findByTestId('remove-pincode-110001'));
    });

    await waitFor(() => {
      expect(queryByText('110001')).toBeNull();
    });
  });

  it('disables Add when 5 pincodes already exist', async () => {
    (userService.getSettings as jest.Mock).mockResolvedValue({
      ...baseSettings,
      secondaryPincodes: ['110001', '400001', '560001', '700001', '600001'],
    });
    const { findByTestId } = render(<SettingsScreen />);
    const input = await findByTestId('secondary-pincode-input');
    expect(input.props.editable).toBe(false);
  });

  it('saves secondary pincodes on Save', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    const input = await findByTestId('secondary-pincode-input');

    await act(async () => {
      fireEvent.changeText(input, '560001');
    });
    await act(async () => {
      fireEvent(input, 'onSubmitEditing');
    });

    await act(async () => {
      fireEvent.press(await findByText('Save'));
    });

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ secondaryPincodes: ['560001'] }),
      );
    });
  });
});

// ─── F10.4: Email digest toggle ───────────────────────────────────────────────

describe('<SettingsScreen /> — F10.4 Email digest toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getSettings as jest.Mock).mockResolvedValue(baseSettings);
    (userService.updateSettings as jest.Mock).mockResolvedValue({});
  });

  it('renders "Email Digest" toggle', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Email Digest')).toBeTruthy();
  });

  it('toggling calls updateSettings with { notificationEmail: true } on Save', async () => {
    const { findByTestId, findByText } = render(<SettingsScreen />);
    await findByText('Email Digest');

    await act(async () => {
      fireEvent(await findByTestId('email-digest-toggle'), 'valueChange', true);
    });

    await act(async () => {
      fireEvent.press(await findByText('Save'));
    });

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ notificationEmail: true }),
      );
    });
  });

  it('pre-loads notificationEmail value from API', async () => {
    (userService.getSettings as jest.Mock).mockResolvedValue({
      ...baseSettings,
      notificationEmail: true,
    });
    const { findByTestId } = render(<SettingsScreen />);
    const toggle = await findByTestId('email-digest-toggle');
    expect(toggle.props.value).toBe(true);
  });
});

// ─── F10.5: Linked accounts ───────────────────────────────────────────────────

describe('<SettingsScreen /> — F10.5 Linked accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getSettings as jest.Mock).mockResolvedValue(baseSettings);
    (userService.updateSettings as jest.Mock).mockResolvedValue({});
  });

  it('renders a "Linked Accounts" section header', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Linked Accounts')).toBeTruthy();
  });

  it('renders Google row with "Link with Google" button', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Google')).toBeTruthy();
    expect(await findByText('Link with Google')).toBeTruthy();
  });

  it('renders Instagram row with "Link with Instagram" button', async () => {
    const { findByText } = render(<SettingsScreen />);
    expect(await findByText('Instagram')).toBeTruthy();
    expect(await findByText('Link with Instagram')).toBeTruthy();
  });

  it('renders Phone row with verified status when user.phone is set', async () => {
    const { findByText } = render(<SettingsScreen />);
    // Linked Accounts section shows a "Verified" status line containing the phone number
    const verifiedEl = await findByText(/Verified/);
    expect(verifiedEl).toBeTruthy();
    // The verified text node includes the phone number inline
    expect(verifiedEl.props.children).toContain('+919876543210');
  });
});
