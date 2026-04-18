import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '@/app/notifications/index';
import { notificationService } from '@/services/notificationService';
import { useNotificationStore } from '@/stores/notificationStore';

jest.mock('@/services/notificationService');

describe('<NotificationsScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset zustand state between tests so stale items don't bleed through.
    useNotificationStore.setState({ items: [], unreadCount: 0, loading: false, page: 1 });
  });

  it('renders a list of notifications from the service', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [
        {
          id: 'n1',
          type: 'points_earned',
          title: 'Points!',
          body: 'You earned 25 pts',
          isRead: false,
          createdAt: new Date().toISOString(),
          data: null,
          deepLink: null,
        },
      ],
      unreadCount: 1,
      page: 1,
      limit: 20,
      total: 1,
    });

    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText('Points!')).toBeTruthy();
    expect(await findByText(/earned 25 pts/i)).toBeTruthy();
  });

  it('shows the "Mark all read" button when unread > 0', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [{ id: 'n1', isRead: false, title: 't', body: 'b', type: 'x', createdAt: 'z', data: null, deepLink: null }],
      unreadCount: 1, page: 1, limit: 20, total: 1,
    });
    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText(/mark all read/i)).toBeTruthy();
  });

  it('tapping "Mark all read" calls the service', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [{ id: 'n1', isRead: false, title: 't', body: 'b', type: 'x', createdAt: 'z', data: null, deepLink: null }],
      unreadCount: 1, page: 1, limit: 20, total: 1,
    });
    (notificationService.markRead as jest.Mock).mockResolvedValue(1);

    const { findByText } = render(<NotificationsScreen />);
    const btn = await findByText(/mark all read/i);
    fireEvent.press(btn);

    await waitFor(() => {
      expect(notificationService.markRead).toHaveBeenCalledWith(['n1']);
    });
  });

  it('shows an empty state when there are no notifications', async () => {
    (notificationService.list as jest.Mock).mockResolvedValue({
      notifications: [], unreadCount: 0, page: 1, limit: 20, total: 0,
    });
    const { findByText } = render(<NotificationsScreen />);
    expect(await findByText(/no notifications yet/i)).toBeTruthy();
  });
});
