import React from 'react';
import { render } from '@testing-library/react-native';
import { PostPointsBadge } from '@/components/PostPointsBadge';

describe('<PostPointsBadge />', () => {
  it('renders "🪙 +8" for points=8', () => {
    const { getByText } = render(<PostPointsBadge points={8} />);
    expect(getByText(/🪙 \+8/)).toBeTruthy();
  });

  it('renders "🪙 +25" for points=25', () => {
    const { getByText } = render(<PostPointsBadge points={25} />);
    expect(getByText(/🪙 \+25/)).toBeTruthy();
  });

  it('returns null for points=0', () => {
    const { queryByText } = render(<PostPointsBadge points={0} />);
    expect(queryByText(/🪙/)).toBeNull();
  });

  it('returns null for negative points', () => {
    const { queryByText } = render(<PostPointsBadge points={-3} />);
    expect(queryByText(/🪙/)).toBeNull();
  });
});
