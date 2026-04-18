import React from 'react';
import { render } from '@testing-library/react-native';
import { QuestRow } from '@/components/QuestRow';

describe('<QuestRow />', () => {
  it('renders filled progress bar when complete', () => {
    const { getByTestId } = render(
      <QuestRow
        quest={{
          id: 'q1',
          title: 'x',
          currentCount: 5,
          targetCount: 5,
          rewardPoints: 25,
          completed: true,
          actionType: 'read_article',
          description: null,
        }}
      />,
    );
    const fill = getByTestId('progress-fill');
    expect(fill.props.style).toEqual(
      expect.objectContaining({ width: '100%', backgroundColor: '#10B981' }),
    );
  });

  it('shows "{n}/{target}" for incomplete', () => {
    const { getByText } = render(
      <QuestRow
        quest={{
          id: 'q1',
          title: 'Watch reels',
          currentCount: 3,
          targetCount: 10,
          rewardPoints: 25,
          completed: false,
          actionType: 'reel_watch',
          description: null,
        }}
      />,
    );
    expect(getByText('3/10')).toBeTruthy();
  });

  it('renders the quest title and reward points', () => {
    const { getByText } = render(
      <QuestRow
        quest={{
          id: 'q1',
          title: 'Share 3 posts',
          currentCount: 1,
          targetCount: 3,
          rewardPoints: 30,
          completed: false,
          actionType: 'share',
          description: null,
        }}
      />,
    );
    expect(getByText('Share 3 posts')).toBeTruthy();
    expect(getByText('+30 pts')).toBeTruthy();
  });
});
