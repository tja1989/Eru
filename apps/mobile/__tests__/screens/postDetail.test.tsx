import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PostDetail from '@/app/post/[id]';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', username: 'me', avatarUrl: null } }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'post-1' }),
  Stack: { Screen: () => null },
}));

describe('<PostDetail />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (contentService.getById as jest.Mock).mockResolvedValue({
      id: 'post-1',
      userId: 'u2',
      type: 'post',
      text: 'Hello world',
      media: [],
      user: { id: 'u2', username: 'author', name: 'Author', avatarUrl: null, tier: 'explorer' },
      likeCount: 0,
      commentCount: 0,
      hashtags: [],
    });
    (contentService.getComments as jest.Mock).mockResolvedValue({
      comments: [],
      page: 1,
      limit: 20,
      total: 0,
    });
  });

  it('renders a CommentInput at the bottom', async () => {
    const { findByPlaceholderText } = render(<PostDetail />);
    expect(await findByPlaceholderText(/add a comment/i)).toBeTruthy();
  });

  it('prepends a new comment to the list after posting', async () => {
    (contentService.createComment as jest.Mock).mockResolvedValue({
      id: 'c-new',
      text: 'First comment!',
      user: { id: 'u1', username: 'me', avatarUrl: null },
      createdAt: new Date().toISOString(),
    });
    const { findByPlaceholderText, getByTestId, findByText } = render(<PostDetail />);
    const input = await findByPlaceholderText(/add a comment/i);
    fireEvent.changeText(input, 'First comment!');
    fireEvent.press(getByTestId('comment-submit'));
    expect(await findByText(/First comment!/)).toBeTruthy();
  });
});
