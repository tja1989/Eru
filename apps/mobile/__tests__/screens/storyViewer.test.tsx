import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import StoryViewer from '@/app/stories/[id]';
import { storiesService } from '@/services/storiesService';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 's1' }),
}));

jest.mock('@/services/storiesService');

const story = (id: string, username: string) => ({
  id,
  userId: `u-${id}`,
  mediaUrl: `https://m/${id}.jpg`,
  thumbnailUrl: null,
  isLive: false,
  createdAt: '2026-04-18T00:00:00Z',
  expiresAt: '2026-04-19T00:00:00Z',
  user: { id: `u-${id}`, username, avatarUrl: null },
  views: [],
});

describe('<StoryViewer />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (storiesService.feed as jest.Mock).mockResolvedValue([
      story('s1', 'tj'),
      story('s2', 'alex'),
    ]);
    (storiesService.markViewed as jest.Mock).mockResolvedValue(undefined);
  });

  it('fetches feed on mount', async () => {
    render(<StoryViewer />);
    await waitFor(() => expect(storiesService.feed).toHaveBeenCalled());
  });

  it('calls markViewed with the current story id once loaded', async () => {
    render(<StoryViewer />);
    await waitFor(() =>
      expect(storiesService.markViewed).toHaveBeenCalledWith('s1'),
    );
  });

  it('tapping the overlay advances to the next story', async () => {
    const { findByTestId, findByText } = render(<StoryViewer />);
    const tap = await findByTestId('story-skip');
    expect(await findByText('tj')).toBeTruthy();
    await act(async () => {
      fireEvent.press(tap);
    });
    expect(await findByText('alex')).toBeTruthy();
  });
});
