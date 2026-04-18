import React from 'react';
import { render } from '@testing-library/react-native';
import { ConversationRow } from '@/components/ConversationRow';
import type { ConversationSummary } from '@/services/messagesService';

const baseConversation: ConversationSummary = {
  id: 'c1',
  otherUser: { id: 'u2', username: 'alice', avatarUrl: null },
  lastMessage: {
    id: 'm1',
    text: 'Hey there!',
    senderId: 'u2',
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  lastMessageAt: new Date().toISOString(),
};

describe('<ConversationRow />', () => {
  it('renders the other user username', () => {
    const { getByText } = render(
      <ConversationRow conversation={baseConversation} onPress={() => {}} />,
    );
    expect(getByText('alice')).toBeTruthy();
  });

  it('renders the last message preview text', () => {
    const { getByText } = render(
      <ConversationRow conversation={baseConversation} onPress={() => {}} />,
    );
    expect(getByText('Hey there!')).toBeTruthy();
  });

  it('shows an unread badge when last message is from otherUser and unread', () => {
    const { getByTestId } = render(
      <ConversationRow conversation={baseConversation} onPress={() => {}} />,
    );
    expect(getByTestId('unread-dot')).toBeTruthy();
  });

  it('does not show an unread badge when last message has readAt', () => {
    const convo: ConversationSummary = {
      ...baseConversation,
      lastMessage: { ...baseConversation.lastMessage!, readAt: new Date().toISOString() },
    };
    const { queryByTestId } = render(
      <ConversationRow conversation={convo} onPress={() => {}} />,
    );
    expect(queryByTestId('unread-dot')).toBeNull();
  });
});
