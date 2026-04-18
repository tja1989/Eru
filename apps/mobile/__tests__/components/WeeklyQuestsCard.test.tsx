import React from 'react';
import { render } from '@testing-library/react-native';
import { WeeklyQuestsCard } from '@/components/WeeklyQuestsCard';
import { questsService } from '@/services/questsService';

jest.mock('@/services/questsService');

describe('<WeeklyQuestsCard />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (questsService.getWeekly as jest.Mock).mockResolvedValue([
      {
        id: 'q1',
        title: 'Read 5 articles',
        currentCount: 5,
        targetCount: 5,
        rewardPoints: 25,
        completed: true,
        actionType: 'read_article',
        description: null,
      },
      {
        id: 'q2',
        title: 'Share 3 posts',
        currentCount: 1,
        targetCount: 3,
        rewardPoints: 30,
        completed: false,
        actionType: 'share',
        description: null,
      },
    ]);
  });

  it('renders a row per quest from the service', async () => {
    const { findByText } = render(<WeeklyQuestsCard />);
    expect(await findByText('Read 5 articles')).toBeTruthy();
    expect(await findByText('Share 3 posts')).toBeTruthy();
  });

  it('renders "{completed}/{total} Complete" count', async () => {
    const { findByText } = render(<WeeklyQuestsCard />);
    expect(await findByText(/1\/2 Complete/)).toBeTruthy();
  });
});
