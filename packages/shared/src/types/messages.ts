// Wire shapes for /conversations and /conversations/:id/messages. Keeps the
// API handlers and mobile service in lockstep so adds to the Message /
// Conversation schema can't silently drop keys on the wire.

export interface MessageUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface WireMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readAt: string | null;
  sender: MessageUser;
}

export interface WireConversation {
  id: string;
  userAId: string;
  userBId: string;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface CreateConversationResponse {
  conversation: WireConversation;
}

export interface ListConversationsItem {
  id: string;
  otherUser: MessageUser | null;
  lastMessage: WireMessage | null;
  lastMessageAt: string | null;
}

export interface ListConversationsResponse {
  conversations: ListConversationsItem[];
}

export interface ListMessagesResponse {
  messages: WireMessage[];
}

export interface SendMessageResponse {
  message: WireMessage;
}
