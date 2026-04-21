import React from 'react';
import { render } from '@testing-library/react-native';
import { ReelTypeBadge } from '@/components/ReelTypeBadge';

describe('<ReelTypeBadge />', () => {
  it('renders "▶ Reel • 0:45" for 45s', () => {
    const { getByText } = render(<ReelTypeBadge durationSeconds={45} />);
    expect(getByText('▶ Reel • 0:45')).toBeTruthy();
  });

  it('renders "▶ Reel • 1:05" for 65s', () => {
    const { getByText } = render(<ReelTypeBadge durationSeconds={65} />);
    expect(getByText('▶ Reel • 1:05')).toBeTruthy();
  });

  it('renders "▶ Reel" without duration when durationSeconds is null', () => {
    const { getByText } = render(<ReelTypeBadge durationSeconds={null} />);
    expect(getByText('▶ Reel')).toBeTruthy();
  });
});
