import React from 'react';
import { render } from '@testing-library/react-native';
import { CreatorScoreTransparencyPanel } from '@/components/CreatorScoreTransparencyPanel';

describe('<CreatorScoreTransparencyPanel />', () => {
  const base = { score: 72, likes: 1200, dislikes: 45, reports: 2, shares: 80, trending: 3 };

  it('renders the "How your score changes" heading', () => {
    const { getByText } = render(<CreatorScoreTransparencyPanel {...base} />);
    expect(getByText(/How your score changes/i)).toBeTruthy();
  });

  it('renders each math rule with the exact PWA values', () => {
    const { getByText } = render(<CreatorScoreTransparencyPanel {...base} />);
    expect(getByText(/\+0\.1 per like/i)).toBeTruthy();
    expect(getByText(/\+0\.3 per share/i)).toBeTruthy();
    expect(getByText(/\+5 per trending/i)).toBeTruthy();
    expect(getByText(/-0\.5 per dislike/i)).toBeTruthy();
    expect(getByText(/-5 per report/i)).toBeTruthy();
  });

  it('renders a like-to-dislike ratio', () => {
    const { getByText } = render(<CreatorScoreTransparencyPanel {...base} />);
    // 1200 / (1200 + 45) ≈ 96%
    expect(getByText(/96%/)).toBeTruthy();
  });

  it('renders a threshold warning when the score is below 40', () => {
    const { getByText } = render(<CreatorScoreTransparencyPanel {...base} score={32} />);
    expect(getByText(/below the 40.*threshold/i)).toBeTruthy();
  });

  it('does NOT render threshold warning when score ≥ 40', () => {
    const { queryByText } = render(<CreatorScoreTransparencyPanel {...base} score={65} />);
    expect(queryByText(/below the 40.*threshold/i)).toBeNull();
  });

  it('renders 0% ratio gracefully when there are no likes + dislikes yet', () => {
    const { getByText } = render(
      <CreatorScoreTransparencyPanel score={50} likes={0} dislikes={0} reports={0} shares={0} trending={0} />,
    );
    expect(getByText(/0%/)).toBeTruthy();
  });
});
