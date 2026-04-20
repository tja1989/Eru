import React from 'react';
import { render } from '@testing-library/react-native';
import { LeaderboardPodium } from '@/components/LeaderboardPodium';

describe('<LeaderboardPodium />', () => {
  const threeUsers = [
    { rank: 1, username: 'alpha', avatarUrl: null, pointsThisWeek: 1200 },
    { rank: 2, username: 'beta', avatarUrl: null, pointsThisWeek: 900 },
    { rank: 3, username: 'gamma', avatarUrl: null, pointsThisWeek: 700 },
  ];

  it('renders rank-1 taller than rank-2 and rank-3', () => {
    const { getByTestId } = render(<LeaderboardPodium top3={threeUsers} />);
    const bar1 = getByTestId('podium-rank-1-bar');
    const bar2 = getByTestId('podium-rank-2-bar');
    const bar3 = getByTestId('podium-rank-3-bar');

    const heightOf = (node: any): number => {
      const flatten = (s: any): any[] => (Array.isArray(s) ? s.flatMap(flatten) : [s]);
      const styles = flatten(node.props.style).filter(Boolean);
      for (const st of styles) {
        if (typeof st === 'object' && typeof st.height === 'number') return st.height;
      }
      return 0;
    };

    const h1 = heightOf(bar1);
    const h2 = heightOf(bar2);
    const h3 = heightOf(bar3);

    expect(h1).toBeGreaterThan(h2);
    expect(h1).toBeGreaterThan(h3);
    expect(h2).toBeGreaterThan(h3);
  });

  it('renders all 3 medals when 3 users provided', () => {
    const { getByText } = render(<LeaderboardPodium top3={threeUsers} />);
    expect(getByText('🥇')).toBeTruthy();
    expect(getByText('🥈')).toBeTruthy();
    expect(getByText('🥉')).toBeTruthy();
  });

  it('handles a single user without crashing', () => {
    const one = [threeUsers[0]];
    const { getByText, queryByTestId } = render(<LeaderboardPodium top3={one} />);
    expect(getByText('🥇')).toBeTruthy();
    expect(queryByTestId('podium-rank-2')).toBeNull();
    expect(queryByTestId('podium-rank-3')).toBeNull();
  });

  it('handles two users without crashing', () => {
    const two = [threeUsers[0], threeUsers[1]];
    const { getByText, queryByTestId } = render(<LeaderboardPodium top3={two} />);
    expect(getByText('🥇')).toBeTruthy();
    expect(getByText('🥈')).toBeTruthy();
    expect(queryByTestId('podium-rank-3')).toBeNull();
  });

  it('returns null for empty array', () => {
    const { toJSON } = render(<LeaderboardPodium top3={[]} />);
    expect(toJSON()).toBeNull();
  });
});
