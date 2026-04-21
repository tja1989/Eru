import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationsScreen from '@/app/notifications/index';

const refresh = jest.fn();
const loadMore = jest.fn();
const markAllRead = jest.fn();

let mockState: any = {
  items: [],
  loading: false,
  unreadCount: 0,
  refresh,
  loadMore,
  markAllRead,
};

jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: (sel: any) => sel(mockState),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

function resetState(items: any[], unreadCount = 0) {
  mockState = { items, loading: false, unreadCount, refresh, loadMore, markAllRead };
}

describe('<NotificationsScreen /> — PWA parity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetState([]);
  });

  it('renders 6 filter tabs (All, Posts, Offers, Leaderboard, Messages, Activity)', () => {
    const { getByText } = render(<NotificationsScreen />);
    ['All', 'Posts', 'Offers', 'Leaderboard', 'Messages', 'Activity'].forEach((l) => {
      expect(getByText(l)).toBeTruthy();
    });
  });

  it('All tab is selected by default', () => {
    const { getByTestId } = render(<NotificationsScreen />);
    expect(getByTestId('notif-tab-all').props.accessibilityState?.selected).toBe(true);
  });

  it('tapping Posts activates that filter', () => {
    const { getByText, getByTestId } = render(<NotificationsScreen />);
    fireEvent.press(getByText('Posts'));
    expect(getByTestId('notif-tab-posts').props.accessibilityState?.selected).toBe(true);
  });

  it('renders NEW / EARLIER section headers when both unread and read notifications exist', () => {
    resetState(
      [
        { id: 'n1', type: 'follower', title: 'Ayesha followed you', body: null, isRead: false, createdAt: new Date().toISOString() },
        { id: 'n2', type: 'post_approved', title: 'Post approved', body: null, isRead: true, createdAt: new Date().toISOString() },
      ],
      1,
    );
    const { getByText } = render(<NotificationsScreen />);
    expect(getByText('NEW')).toBeTruthy();
    expect(getByText('EARLIER')).toBeTruthy();
  });

  it('filter Posts shows only post-family notifications', () => {
    resetState([
      { id: 'n1', type: 'follower', title: 'Ayesha followed you', isRead: false, createdAt: new Date().toISOString() },
      { id: 'n2', type: 'post_approved', title: 'Your post approved', isRead: false, createdAt: new Date().toISOString() },
      { id: 'n3', type: 'trending', title: 'You are trending', isRead: false, createdAt: new Date().toISOString() },
    ]);
    const { getByText, queryByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText('Posts'));
    expect(queryByText('Ayesha followed you')).toBeNull();
    expect(getByText('Your post approved')).toBeTruthy();
    expect(getByText('You are trending')).toBeTruthy();
  });
});
