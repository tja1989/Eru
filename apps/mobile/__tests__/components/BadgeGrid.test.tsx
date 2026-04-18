import React from 'react';
import { render } from '@testing-library/react-native';
import { BadgeGrid } from '@/components/BadgeGrid';

describe('<BadgeGrid />', () => {
  const base = { id: 'b1', code: 'a', title: 'A', description: '', emoji: '🔥' };

  it('renders unlocked badge without 0.25 opacity', () => {
    const { getByTestId } = render(
      <BadgeGrid badges={[{ ...base, unlockedAt: '2026-04-18' }]} />,
    );
    const badge = getByTestId('badge-a');
    const style = Array.isArray(badge.props.style) ? badge.props.style : [badge.props.style];
    expect(style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.25 })]),
    );
  });

  it('renders locked badge at 0.25 opacity', () => {
    const { getByTestId } = render(
      <BadgeGrid badges={[{ ...base, unlockedAt: null }]} />,
    );
    const badge = getByTestId('badge-a');
    expect(badge.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ opacity: 0.25 })]),
    );
  });

  it('renders the badge emoji and title', () => {
    const { getByText } = render(
      <BadgeGrid badges={[{ ...base, unlockedAt: null }]} />,
    );
    expect(getByText('🔥')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
  });
});
