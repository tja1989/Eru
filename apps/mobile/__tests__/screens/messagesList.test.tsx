import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MessagesListScreen from '@/app/messages/index';
import { messagesService } from '@/services/messagesService';
import { useRouter } from 'expo-router';

jest.mock('@/services/messagesService');

const pushMock = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: () => ({}),
}));

describe('<MessagesListScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: pushMock, back: jest.fn() });
  });

  it('renders conversations returned from the service', async () => {
    (messagesService.listConversations as jest.Mock).mockResolvedValue([
      {
        id: 'c1',
        otherUser: { id: 'u2', username: 'alice', avatarUrl: null },
        lastMessage: {
          id: 'm1',
          text: 'hi there',
          senderId: 'u2',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        lastMessageAt: new Date().toISOString(),
      },
    ]);

    const { findByText } = render(<MessagesListScreen />);
    expect(await findByText('alice')).toBeTruthy();
    expect(await findByText('hi there')).toBeTruthy();
  });

  it('tapping a conversation row navigates to /messages/:id', async () => {
    (messagesService.listConversations as jest.Mock).mockResolvedValue([
      {
        id: 'c1',
        otherUser: { id: 'u2', username: 'alice', avatarUrl: null },
        lastMessage: null,
        lastMessageAt: null,
      },
    ]);

    const { findByText } = render(<MessagesListScreen />);
    const row = await findByText('alice');
    fireEvent.press(row);
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/messages/c1');
    });
  });

  it('shows empty state when there are no conversations', async () => {
    (messagesService.listConversations as jest.Mock).mockResolvedValue([]);
    const { findByText } = render(<MessagesListScreen />);
    expect(await findByText(/no conversations yet/i)).toBeTruthy();
  });
});
