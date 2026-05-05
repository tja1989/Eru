import React from 'react';
import { render } from '@testing-library/react-native';
import { BusinessReplyCard } from '@/components/BusinessReplyCard';

describe('<BusinessReplyCard />', () => {
  const base = {
    id: 'r1',
    text: 'Thanks for the kind words!',
    createdAt: new Date().toISOString(),
    user: { id: 'b1', username: 'KashiBakes', avatarUrl: null },
    verified: true,
  };

  it('renders the username + body', () => {
    const { getByText } = render(<BusinessReplyCard {...base} />);
    expect(getByText('@KashiBakes')).toBeTruthy();
    expect(getByText(/Thanks for the kind words/i)).toBeTruthy();
  });

  it('shows a verified ✓ when verified=true', () => {
    const { getByText } = render(<BusinessReplyCard {...base} />);
    expect(getByText('✓')).toBeTruthy();
  });

  it('hides ✓ when verified=false', () => {
    const { queryByText } = render(<BusinessReplyCard {...base} verified={false} />);
    expect(queryByText('✓')).toBeNull();
  });
});
