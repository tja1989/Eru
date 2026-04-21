import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import CreateScreen from '@/app/(tabs)/create';
import { contentService } from '@/services/contentService';
import { businessService } from '@/services/businessService';

jest.mock('@/services/contentService');
jest.mock('@/services/businessService');
jest.mock('@/services/userService');
jest.mock('@/services/mediaService', () => ({
  mediaService: { upload: jest.fn(), uploadFileToS3: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

describe('<CreateScreen /> — PWA parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.create as jest.Mock).mockResolvedValue({ id: 'c1' });
    (businessService.search as jest.Mock).mockResolvedValue([
      { id: 'b1', name: 'Kashi Bakes', category: 'bakery', pincode: '682016', avatarUrl: null },
    ]);
  });

  it('renders header title "Create Post"', () => {
    const { getByText } = render(<CreateScreen />);
    expect(getByText('Create Post')).toBeTruthy();
  });

  it('renders the PointsPreviewCard with +30/+1/+200', () => {
    const { getByText } = render(<CreateScreen />);
    expect(getByText(/🪙 Points You'll Earn/)).toBeTruthy();
    expect(getByText('+30')).toBeTruthy();
    expect(getByText('+1')).toBeTruthy();
    expect(getByText('+200')).toBeTruthy();
  });

  it('renders the ModerationNoticeCard with 15-minute + +30pt copy', () => {
    const { getByText } = render(<CreateScreen />);
    expect(getByText(/🛡️ Content Review/)).toBeTruthy();
    expect(getByText(/approved within 15 minutes/i)).toBeTruthy();
  });

  it('renders the BusinessTagPicker block on the create screen', () => {
    const { getByText } = render(<CreateScreen />);
    expect(getByText(/🏪 Tag a Business/)).toBeTruthy();
  });

  it('submit forwards businessTagId to contentService.create when a business is selected', async () => {
    jest.useFakeTimers();
    try {
      const { getByTestId, getByText, getByPlaceholderText, findByText } = render(<CreateScreen />);
      // Pick review subtype
      fireEvent.press(getByTestId('subtype-card-review'));
      // Open text compose
      fireEvent.press(getByText('✍️ Text'));
      fireEvent.changeText(getByPlaceholderText("What's on your mind?"), 'Awesome cakes here!');
      // Tag business via picker
      fireEvent.changeText(getByPlaceholderText(/Search businesses/i), 'kash');
      await act(async () => { jest.advanceTimersByTime(150); });
      const row = await findByText('Kashi Bakes');
      fireEvent.press(row);
      // Share
      fireEvent.press(getByText('Share'));
      await waitFor(() => {
        expect(contentService.create).toHaveBeenCalledWith(
          expect.objectContaining({ subtype: 'review', businessTagId: 'b1' }),
        );
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
