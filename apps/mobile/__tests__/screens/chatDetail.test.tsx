import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatDetailScreen from '@/app/messages/[id]';
import { messagesService } from '@/services/messagesService';

jest.mock('@/services/messagesService');

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'c1' }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: any) => sel({ user: { id: 'u-me', name: 't', username: 't', phone: '+0', tier: 'explorer', currentBalance: 0 } }),
}));

describe('<ChatDetailScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches messages on mount using the conversation id', async () => {
    (messagesService.listMessages as jest.Mock).mockResolvedValue([
      { id: 'm1', text: 'hello', senderId: 'u2', createdAt: '2026-04-18T10:00:00Z' },
    ]);

    const { findByText } = render(<ChatDetailScreen />);
    expect(await findByText('hello')).toBeTruthy();
    expect(messagesService.listMessages).toHaveBeenCalledWith('c1');
  });

  it('sends a message and appends it to the list', async () => {
    (messagesService.listMessages as jest.Mock).mockResolvedValue([]);
    (messagesService.send as jest.Mock).mockResolvedValue({
      id: 'm1',
      text: 'hi',
      senderId: 'u1',
      createdAt: '2026-04-18T10:00:00Z',
    });

    const { getByPlaceholderText, getByTestId, findByText } = render(<ChatDetailScreen />);
    fireEvent.changeText(getByPlaceholderText(/type a message/i), 'hi');
    fireEvent.press(getByTestId('send-btn'));

    await waitFor(() => {
      expect(messagesService.send).toHaveBeenCalledWith('c1', 'hi');
    });
    expect(await findByText('hi')).toBeTruthy();
  });

  it('does not send when text is empty/whitespace', async () => {
    (messagesService.listMessages as jest.Mock).mockResolvedValue([]);
    const { getByTestId } = render(<ChatDetailScreen />);
    fireEvent.press(getByTestId('send-btn'));
    await waitFor(() => {
      expect(messagesService.send).not.toHaveBeenCalled();
    });
  });

  it('renders historic messages from the current user as "mine" (sourced from authStore, not last-sent)', async () => {
    // A message sent by the authenticated user BEFORE they send anything this session.
    // Pre-fix, currentUserId was '' until the user sent a message, so this would
    // incorrectly render as theirs (left-aligned, grey bubble). The fix reads the
    // id from authStore, which this test's mock hands back as 'u-me'.
    (messagesService.listMessages as jest.Mock).mockResolvedValue([
      { id: 'm-historic', text: 'I sent this yesterday', senderId: 'u-me', createdAt: '2026-04-17T10:00:00Z' },
    ]);

    const { findAllByTestId } = render(<ChatDetailScreen />);
    const wrappers = await findAllByTestId('bubble-wrapper');
    expect(wrappers).toHaveLength(1);
    // "mine" bubbles align to flex-end (right side). The MessageBubble applies
    // `alignSelf: 'flex-end'` when isMine is true — a cheap proxy for the flag.
    const style = Array.isArray(wrappers[0].props.style)
      ? Object.assign({}, ...wrappers[0].props.style.flat())
      : wrappers[0].props.style;
    expect(style.alignSelf).toBe('flex-end');
  });
});
