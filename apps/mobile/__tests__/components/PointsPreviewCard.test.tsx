import React from 'react';
import { render } from '@testing-library/react-native';
import { PointsPreviewCard } from '@/components/PointsPreviewCard';

describe('<PointsPreviewCard />', () => {
  it('renders the 🪙 heading "Points You\'ll Earn"', () => {
    const { getByText } = render(<PointsPreviewCard />);
    expect(getByText(/🪙 Points You'll Earn/)).toBeTruthy();
  });

  it('renders the three column labels: Post approved, Each like, If it trends', () => {
    const { getByText } = render(<PointsPreviewCard />);
    expect(getByText(/Post approved/i)).toBeTruthy();
    expect(getByText(/Each like received/i)).toBeTruthy();
    expect(getByText(/If it trends/i)).toBeTruthy();
  });

  it('renders +30, +1, +200 values', () => {
    const { getByText } = render(<PointsPreviewCard />);
    expect(getByText('+30')).toBeTruthy();
    expect(getByText('+1')).toBeTruthy();
    expect(getByText('+200')).toBeTruthy();
  });
});
