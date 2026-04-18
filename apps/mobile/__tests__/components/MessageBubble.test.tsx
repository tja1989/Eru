import React from 'react';
import { render } from '@testing-library/react-native';
import { MessageBubble } from '@/components/MessageBubble';
import type { Message } from '@/services/messagesService';

const baseMessage: Message = {
  id: 'm1',
  text: 'Hello world',
  senderId: 'u1',
  createdAt: '2026-04-18T12:34:00.000Z',
};

describe('<MessageBubble />', () => {
  it('renders the message text', () => {
    const { getByText } = render(<MessageBubble message={baseMessage} isMine={false} />);
    expect(getByText('Hello world')).toBeTruthy();
  });

  it('aligns left when isMine=false', () => {
    const { getByTestId } = render(<MessageBubble message={baseMessage} isMine={false} />);
    const wrapper = getByTestId('bubble-wrapper');
    const style = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style.filter(Boolean))
      : wrapper.props.style;
    expect(style.alignSelf).toBe('flex-start');
  });

  it('aligns right when isMine=true', () => {
    const { getByTestId } = render(<MessageBubble message={baseMessage} isMine={true} />);
    const wrapper = getByTestId('bubble-wrapper');
    const style = Array.isArray(wrapper.props.style)
      ? Object.assign({}, ...wrapper.props.style.filter(Boolean))
      : wrapper.props.style;
    expect(style.alignSelf).toBe('flex-end');
  });
});
