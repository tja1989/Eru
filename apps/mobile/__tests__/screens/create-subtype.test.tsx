import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateScreen from '@/app/(tabs)/create';
import { contentService } from '@/services/contentService';
import { Alert } from 'react-native';

jest.mock('@/services/contentService');
jest.mock('@/services/userService');
jest.mock('@/services/mediaService', () => ({
  mediaService: {
    upload: jest.fn(),
    uploadFileToS3: jest.fn(),
  },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

describe('<CreateScreen /> — content subtype selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.create as jest.Mock).mockResolvedValue({ id: 'c1' });
  });

  it('renders all 12 subtype cards', () => {
    const { getByTestId } = render(<CreateScreen />);
    const keys = [
      'review','recommendation','vlog','photo_story','tutorial','comparison',
      'unboxing','event_coverage','hot_take','meme','recipe','local_guide',
    ];
    for (const k of keys) {
      expect(getByTestId(`subtype-card-${k}`)).toBeTruthy();
    }
  });

  it('no banner is rendered before any subtype is picked', () => {
    const { queryByTestId } = render(<CreateScreen />);
    expect(queryByTestId('subtype-banner')).toBeNull();
  });

  it('tapping Review shows the 3x-reach banner', () => {
    const { getByTestId, queryByText } = render(<CreateScreen />);
    fireEvent.press(getByTestId('subtype-card-review'));
    expect(getByTestId('subtype-banner')).toBeTruthy();
    expect(queryByText(/3x more reach/i)).toBeTruthy();
  });

  it('tapping Meme swaps the banner text to the Meme copy', () => {
    const { getByTestId, queryByText } = render(<CreateScreen />);
    fireEvent.press(getByTestId('subtype-card-review'));
    fireEvent.press(getByTestId('subtype-card-meme'));
    expect(queryByText(/3x more reach/i)).toBeNull();
    expect(queryByText(/Meme: Keep it light/i)).toBeTruthy();
  });

  it('Share stays disabled until a subtype is picked', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByText, getByPlaceholderText } = render(<CreateScreen />);
    fireEvent.press(getByText('✍️ Text'));
    fireEvent.changeText(getByPlaceholderText("What's on your mind?"), 'Hello world');
    fireEvent.press(getByText('Share'));
    expect(contentService.create).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('submit forwards the chosen subtype to contentService.create', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<CreateScreen />);
    fireEvent.press(getByTestId('subtype-card-review'));
    fireEvent.press(getByText('✍️ Text'));
    fireEvent.changeText(getByPlaceholderText("What's on your mind?"), 'Great little bookshop in Fort Kochi');
    fireEvent.press(getByText('Share'));
    await waitFor(() => {
      expect(contentService.create).toHaveBeenCalledWith(
        expect.objectContaining({ subtype: 'review' }),
      );
    });
  });
});
