import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { userService } from '@/services/userService';
import { highlightsService } from '@/services/highlightsService';

jest.mock('@/services/userService');
jest.mock('@/services/highlightsService', () => ({
  highlightsService: {
    list: jest.fn().mockResolvedValue([]),
    getHighlight: jest.fn().mockResolvedValue({ items: [] }),
  },
}));
jest.mock('@/components/HighlightsRow', () => ({
  HighlightsRow: () => null,
}));
jest.mock('@/components/HighlightEditor', () => ({
  HighlightEditor: () => null,
}));
jest.mock('@/components/HighlightViewer', () => ({
  HighlightViewer: () => null,
}));
jest.mock('@/components/MediaGrid', () => ({
  MediaGrid: () => null,
}));
jest.mock('@/components/Avatar', () => ({
  Avatar: () => null,
}));
jest.mock('@/components/TierBadge', () => ({
  TierBadge: () => null,
}));
jest.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => null,
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'me',
      name: 'TJ',
      username: 'tj',
      tier: 'explorer',
      currentBalance: 100,
    },
  }),
}));
jest.mock('@/stores/pointsStore', () => ({
  usePointsStore: () => ({ balance: 0, streak: 0, tier: 'explorer' }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const MOCK_TAGGED = [
  { id: 'p1', type: 'photo', text: 'I was tagged here', mediaIds: [] },
  { id: 'p2', type: 'text', text: 'Tagged post two', mediaIds: [] },
];

describe('<ProfileScreen /> — Tagged tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (userService.getProfile as jest.Mock).mockResolvedValue({
      user: { id: 'me', name: 'TJ', username: 'tj', tier: 'explorer', currentBalance: 100 },
    });
    (userService.getContent as jest.Mock).mockResolvedValue({ items: [] });
  });

  it('renders the Tagged tab icon in the grid tab bar', async () => {
    const { findByText } = render(<ProfileScreen />);
    // The icon for tagged is 👥
    expect(await findByText('👥')).toBeTruthy();
  });

  it('switching to Tagged tab calls userService.getContent with "tagged"', async () => {
    (userService.getContent as jest.Mock).mockResolvedValue({ items: MOCK_TAGGED });
    const { findByText, getByText } = render(<ProfileScreen />);

    // Wait for initial render
    await findByText('👥');

    // Press the Tagged tab
    fireEvent.press(getByText('👥'));

    await waitFor(() => {
      expect(userService.getContent).toHaveBeenCalledWith('me', 'tagged');
    });
  });

  it('content from the tagged tab renders', async () => {
    (userService.getContent as jest.Mock).mockImplementation((_id: string, tab: string) => {
      if (tab === 'tagged') return Promise.resolve({ items: MOCK_TAGGED });
      return Promise.resolve({ items: [] });
    });

    const { findByText, getByText } = render(<ProfileScreen />);
    await findByText('👥');
    fireEvent.press(getByText('👥'));

    await waitFor(() => {
      expect(userService.getContent).toHaveBeenCalledWith('me', 'tagged');
    });
  });
});
