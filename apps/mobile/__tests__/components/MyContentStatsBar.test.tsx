import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MyContentStatsBar } from '@/components/MyContentStatsBar';
import { userService } from '@/services/userService';

jest.mock('@/services/userService');

describe('<MyContentStatsBar />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getMyContentSummary as jest.Mock).mockResolvedValue({
      published: 23,
      pending: 2,
      declined: 1,
      totalLikes: 8420,
    });
  });

  it('renders all four metric values after fetch', async () => {
    const { findByText } = render(<MyContentStatsBar />);
    expect(await findByText('23')).toBeTruthy();
    expect(await findByText('2')).toBeTruthy();
    expect(await findByText('1')).toBeTruthy();
    expect(await findByText(/8[,.]?420/)).toBeTruthy();
  });

  it('renders zero placeholders before fetch resolves', () => {
    (userService.getMyContentSummary as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getAllByText } = render(<MyContentStatsBar />);
    expect(getAllByText('0').length).toBeGreaterThanOrEqual(3);
  });

  it('shows labels Published / In Review / Declined / Total Likes', async () => {
    const { findByText } = render(<MyContentStatsBar />);
    expect(await findByText(/^Published$/i)).toBeTruthy();
    expect(await findByText(/^In Review$/i)).toBeTruthy();
    expect(await findByText(/^Declined$/i)).toBeTruthy();
    expect(await findByText(/^Total Likes$/i)).toBeTruthy();
  });
});
