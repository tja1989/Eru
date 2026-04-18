import React from 'react';
import { render } from '@testing-library/react-native';
import { CreatorScoreCard } from '@/components/CreatorScoreCard';

// react-native-svg is already transformed via transformIgnorePatterns in jest.config.js.
// If the SVG module causes issues in CI the transformIgnorePatterns list already
// includes react-native-svg.

describe('<CreatorScoreCard />', () => {
  it('renders the score value and /100 suffix', () => {
    const { getByText } = render(<CreatorScoreCard score={87} />);
    expect(getByText('87')).toBeTruthy();
    expect(getByText('/100')).toBeTruthy();
  });

  it('rounds fractional scores', () => {
    const { getByText } = render(<CreatorScoreCard score={72.6} />);
    expect(getByText('73')).toBeTruthy();
  });

  it('shows green up-arrow delta for positive change', () => {
    const { getByText } = render(
      <CreatorScoreCard score={87} deltaThisWeek={3} />,
    );
    // Unicode up arrow ⬆ + non-breaking plus
    expect(getByText(/⬆ \+3 this week/)).toBeTruthy();
  });

  it('shows red down-arrow delta for negative change', () => {
    const { getByText } = render(
      <CreatorScoreCard score={65} deltaThisWeek={-2} />,
    );
    // Unicode down arrow ⬇ + unicode minus sign −
    expect(getByText(/⬇ −2 this week/)).toBeTruthy();
  });

  it('hides the delta chip when deltaThisWeek is absent', () => {
    const { queryByText } = render(<CreatorScoreCard score={50} />);
    expect(queryByText(/this week/)).toBeNull();
  });

  it('hides the delta chip when deltaThisWeek is 0', () => {
    const { queryByText } = render(
      <CreatorScoreCard score={50} deltaThisWeek={0} />,
    );
    expect(queryByText(/this week/)).toBeNull();
  });

  it('compact variant renders score and suffix without ring or delta', () => {
    const { getByText, queryByTestId, queryByText } = render(
      <CreatorScoreCard score={42} deltaThisWeek={5} compact />,
    );
    // Score and suffix still visible
    expect(getByText('42')).toBeTruthy();
    expect(getByText('/100')).toBeTruthy();
    // Ring SVG is absent
    expect(queryByTestId('score-ring-circle')).toBeNull();
    // Delta chip is absent
    expect(queryByText(/this week/)).toBeNull();
  });
});
