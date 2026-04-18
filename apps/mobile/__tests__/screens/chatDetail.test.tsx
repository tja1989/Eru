import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatDetailScreen from '@/app/messages/[id]';
import { messagesService } from '@/services/messagesService';

jest.mock('@/services/messagesService');

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: 'c1' }),
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
});
