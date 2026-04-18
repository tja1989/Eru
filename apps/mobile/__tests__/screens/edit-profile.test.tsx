import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditProfileScreen from '@/app/edit-profile/index';
import { userService } from '@/services/userService';
import { mediaService } from '@/services/mediaService';
import * as ImagePicker from 'expo-image-picker';

// --- Service mocks -------------------------------------------------------
jest.mock('@/services/userService');
jest.mock('@/services/mediaService', () => ({
  mediaService: {
    upload: jest.fn(),
    presign: jest.fn(),
    uploadFileToS3: jest.fn(),
  },
}));

// --- expo-image-picker mock ----------------------------------------------
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// --- expo-router mock ----------------------------------------------------
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
}));

// --- authStore mock -------------------------------------------------------
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'u1',
      name: 'TJ Abraham',
      username: 'tjabraham',
      tier: 'explorer',
      currentBalance: 0,
    },
    setUser: jest.fn(),
  }),
}));

// --- react-native-safe-area-context mock ---------------------------------
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => <View {...props}>{children}</View>,
  };
});

import { Alert } from 'react-native';

// =========================================================================
describe('<EditProfileScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (userService.getSettings as jest.Mock).mockResolvedValue({
      name: 'TJ Abraham',
      username: 'tjabraham',
      bio: 'Hello world',
      avatarUrl: null,
    });
    (userService.updateSettings as jest.Mock).mockResolvedValue({
      settings: { name: 'TJ Abraham', username: 'tjabraham', bio: 'Hello world', avatarUrl: null },
    });
  });

  // -----------------------------------------------------------------------
  it('renders with pre-filled name, username, bio from getSettings', async () => {
    const { findByDisplayValue } = render(<EditProfileScreen />);
    expect(await findByDisplayValue('TJ Abraham')).toBeTruthy();
    expect(await findByDisplayValue('tjabraham')).toBeTruthy();
    expect(await findByDisplayValue('Hello world')).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  it('updating name + pressing Save calls updateSettings with new name', async () => {
    const { findByDisplayValue, getByText } = render(<EditProfileScreen />);

    const nameInput = await findByDisplayValue('TJ Abraham');
    fireEvent.changeText(nameInput, 'TJ Updated');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(userService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'TJ Updated' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  it('shows "Profile saved" alert after successful save', async () => {
    const { findByDisplayValue, getByText } = render(<EditProfileScreen />);
    await findByDisplayValue('TJ Abraham');

    fireEvent.press(getByText('Save'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        expect.stringMatching(/saved/i),
        expect.any(String),
        expect.anything(),
      );
    });
  });

  // -----------------------------------------------------------------------
  it('avatar tap opens image library picker', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: true,
      assets: null,
    });

    const { findByTestId } = render(<EditProfileScreen />);
    const avatarBtn = await findByTestId('avatar-tap-btn');
    fireEvent.press(avatarBtn);

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  it('selecting an image uploads via mediaService and sets avatarUrl', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', mimeType: 'image/jpeg', width: 400, height: 400 }],
    });
    (mediaService.presign as jest.Mock).mockResolvedValue({
      uploadUrl: 'https://s3.example.com/upload',
      fileUrl: 'https://cdn.example.com/photo.jpg',
    });
    (mediaService.uploadFileToS3 as jest.Mock).mockResolvedValue(undefined);

    const { findByTestId } = render(<EditProfileScreen />);
    const avatarBtn = await findByTestId('avatar-tap-btn');
    fireEvent.press(avatarBtn);

    await waitFor(() => {
      expect(mediaService.presign).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/jpeg' }),
      );
      expect(mediaService.uploadFileToS3).toHaveBeenCalledWith(
        'https://s3.example.com/upload',
        expect.objectContaining({ uri: 'file:///photo.jpg' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  it('username 409 conflict shows inline error "Username already taken"', async () => {
    (userService.updateSettings as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Conflict'), { response: { status: 409 } }),
    );

    const { findByDisplayValue, getByText, findByText } = render(<EditProfileScreen />);

    const usernameInput = await findByDisplayValue('tjabraham');
    fireEvent.changeText(usernameInput, 'takenuser');

    fireEvent.press(getByText('Save'));

    await findByText(/username already taken/i);
  });
});
