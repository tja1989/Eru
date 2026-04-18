import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CommentInput } from '@/components/CommentInput';
import { contentService } from '@/services/contentService';

jest.mock('@/services/contentService');
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'u1', avatarUrl: null, username: 'me' } }),
}));

describe('<CommentInput />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a text input and disabled post button when empty', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    expect(getByPlaceholderText(/add a comment/i)).toBeTruthy();
    expect(getByTestId('comment-submit').props.accessibilityState?.disabled).toBe(true);
  });

  it('enables the post button once text is entered', () => {
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    fireEvent.changeText(getByPlaceholderText(/add a comment/i), 'hi');
    expect(getByTestId('comment-submit').props.accessibilityState?.disabled).toBe(false);
  });

  it('calls contentService.createComment and onPosted on submit', async () => {
    (contentService.createComment as jest.Mock).mockResolvedValue({
      id: 'c-new',
      text: 'hello world',
      user: { username: 'me' },
    });
    const onPosted = jest.fn();
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={onPosted} />,
    );
    fireEvent.changeText(getByPlaceholderText(/add a comment/i), 'hello world');
    fireEvent.press(getByTestId('comment-submit'));

    await waitFor(() => {
      expect(contentService.createComment).toHaveBeenCalledWith('c1', 'hello world', undefined);
      expect(onPosted).toHaveBeenCalledWith(expect.objectContaining({ id: 'c-new' }));
    });
  });

  it('clears the input after successful submit', async () => {
    (contentService.createComment as jest.Mock).mockResolvedValue({ id: 'x', text: 'x', user: {} });
    const { getByPlaceholderText, getByTestId } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    const input = getByPlaceholderText(/add a comment/i);
    fireEvent.changeText(input, 'hello');
    fireEvent.press(getByTestId('comment-submit'));

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('shows an inline error when createComment rejects', async () => {
    (contentService.createComment as jest.Mock).mockRejectedValue(new Error('network boom'));
    const { getByPlaceholderText, getByTestId, findByText } = render(
      <CommentInput contentId="c1" onPosted={jest.fn()} />,
    );
    fireEvent.changeText(getByPlaceholderText(/add a comment/i), 'hi');
    fireEvent.press(getByTestId('comment-submit'));

    expect(await findByText(/couldn't post/i)).toBeTruthy();
  });
});
