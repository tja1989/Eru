import React from 'react';
import { render } from '@testing-library/react-native';
import { TierProgressCard } from '@/components/TierProgressCard';

describe('<TierProgressCard />', () => {
  it('shows current tier and multiplier', () => {
    const { getByText } = render(
      <TierProgressCard
        currentTier="influencer"
        nextTier="champion"
        pointsToNext={4820}
        lifetimePoints={45180}
      />,
    );
    expect(getByText(/influencer/i)).toBeTruthy();
    expect(getByText(/1\.5x/i)).toBeTruthy();
  });

  it('shows points to next tier', () => {
    const { getByText, getAllByText } = render(
      <TierProgressCard
        currentTier="influencer"
        nextTier="champion"
        pointsToNext={4820}
        lifetimePoints={45180}
      />,
    );
    expect(getByText(/4,820/)).toBeTruthy();
    // "Champion" appears in the Next: chip AND the hint — one or more is fine.
    expect(getAllByText(/champion/i).length).toBeGreaterThan(0);
  });

  it('renders progress bar fill proportional to progress', () => {
    const { getByTestId } = render(
      <TierProgressCard
        currentTier="engager"
        nextTier="influencer"
        pointsToNext={2000}
        lifetimePoints={8000}
      />,
    );
    const fill = getByTestId('progress-fill');
    // 8000 / 10000 = 80%
    expect(fill.props.style).toEqual(expect.objectContaining({ width: '80%' }));
  });

  it('hides progress bar if at max tier', () => {
    const { queryByTestId } = render(
      <TierProgressCard
        currentTier="champion"
        nextTier={null}
        pointsToNext={0}
        lifetimePoints={80000}
      />,
    );
    expect(queryByTestId('progress-fill')).toBeNull();
  });

  it('renders "Next: 👑 Champion" chip above the progress bar', () => {
    const { getByText, getAllByText } = render(
      <TierProgressCard
        currentTier="influencer"
        nextTier="champion"
        pointsToNext={4820}
        lifetimePoints={45180}
      />,
    );
    expect(getByText(/Next:/)).toBeTruthy();
    // Champion's emoji is 👑 — appears in the chip only.
    expect(getByText(/👑/)).toBeTruthy();
    // "Champion" appears in both the chip and the pts-away hint.
    expect(getAllByText(/Champion/).length).toBeGreaterThan(0);
  });

  it('Next: chip shows the nextTier emoji (engager → ⚡)', () => {
    const { getByText } = render(
      <TierProgressCard
        currentTier="explorer"
        nextTier="engager"
        pointsToNext={2000}
        lifetimePoints={0}
      />,
    );
    expect(getByText(/⚡/)).toBeTruthy();
  });
});
