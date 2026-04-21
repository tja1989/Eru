import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DonateTile } from '@/components/DonateTile';

describe('<DonateTile />', () => {
  it('renders emoji + title + cost copy', () => {
    const { getByText } = render(
      <DonateTile
        emoji="🌳"
        title="Plant a Tree"
        costCopy="500 pts = 1 tree"
        matchCopy="Eru adds +100 pts match"
        onPress={jest.fn()}
      />,
    );
    expect(getByText('🌳')).toBeTruthy();
    expect(getByText('Plant a Tree')).toBeTruthy();
    expect(getByText('500 pts = 1 tree')).toBeTruthy();
  });

  it('renders the green match-copy line', () => {
    const { getByText } = render(
      <DonateTile
        emoji="📚"
        title="Books for Kids"
        costCopy="1,000 pts = 3 books"
        matchCopy="Eru adds +200 pts match"
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Eru adds +200 pts match')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <DonateTile
        emoji="🤝"
        title="Local Cause"
        costCopy="200 pts"
        matchCopy="Eru adds +40 pts match"
        onPress={onPress}
      />,
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
