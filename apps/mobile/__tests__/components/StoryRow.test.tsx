import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StoryRow } from '@/components/StoryRow';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const baseUser = { id: 'u1', username: 'tj', avatarUrl: null };
const unseenStory = {
  id: 's1',
  userId: 'u1',
  mediaUrl: 'https://m/1.jpg',
  thumbnailUrl: null,
  isLive: false,
  createdAt: '2026-04-18T00:00:00Z',
  expiresAt: '2026-04-19T00:00:00Z',
  user: baseUser,
  views: [],
};
const seenStory = {
  ...unseenStory,
  id: 's2',
  user: { id: 'u2', username: 'alex', avatarUrl: null },
  views: [{ id: 'v1' }],
};

describe('<StoryRow />', () => {
  beforeEach(() => mockPush.mockClear());

  it('renders the "Your story" entry', () => {
    const { getByText } = render(<StoryRow stories={[]} />);
    expect(getByText('Your story')).toBeTruthy();
  });

  it('renders a username for each story', () => {
    const { getByText } = render(<StoryRow stories={[unseenStory, seenStory]} />);
    expect(getByText('tj')).toBeTruthy();
    expect(getByText('alex')).toBeTruthy();
  });

  it('tapping a story pushes to /stories/:id', () => {
    const { getByTestId } = render(<StoryRow stories={[unseenStory]} />);
    fireEvent.press(getByTestId('story-s1'));
    expect(mockPush).toHaveBeenCalledWith('/stories/s1');
  });

  it('seen story has a different ring style than unseen', () => {
    const { getByTestId } = render(<StoryRow stories={[unseenStory, seenStory]} />);
    const unseenRing = getByTestId('story-ring-s1');
    const seenRing = getByTestId('story-ring-s2');
    const unseenStyle = Array.isArray(unseenRing.props.style)
      ? Object.assign({}, ...unseenRing.props.style)
      : unseenRing.props.style;
    const seenStyle = Array.isArray(seenRing.props.style)
      ? Object.assign({}, ...seenRing.props.style)
      : seenRing.props.style;
    expect(unseenStyle.borderColor).not.toBe(seenStyle.borderColor);
  });
});
