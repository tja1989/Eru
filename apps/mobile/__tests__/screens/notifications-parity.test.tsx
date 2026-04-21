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

const mockNavPush = jest.fn();

jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: (sel: any) => sel(mockState),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockNavPush }),
}));
jest.mock('@/services/userService', () => ({
  userService: { follow: jest.fn().mockResolvedValue({}) },
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

  it('follower notification renders a "Follow back" button', () => {
    resetState([
      { id: 'n1', type: 'follower', title: 'Ayesha followed you', data: { userId: 'u-ayesha' }, isRead: false, createdAt: new Date().toISOString() },
    ]);
    const { getByText } = render(<NotificationsScreen />);
    expect(getByText('Follow back')).toBeTruthy();
  });

  it('boost_proposal notification renders a "Tap to accept" CTA', () => {
    resetState([
      { id: 'n1', type: 'boost_proposal', title: 'Kashi Bakes wants to boost your post', data: { proposalId: 'p1' }, deepLink: '/sponsorship', isRead: false, createdAt: new Date().toISOString() },
    ]);
    const { getByText } = render(<NotificationsScreen />);
    expect(getByText(/Tap to accept/i)).toBeTruthy();
  });

  it('post_approved notification renders a "View post" CTA that navigates', () => {
    resetState([
      { id: 'n1', type: 'post_approved', title: 'Your post is live!', data: { contentId: 'c-123' }, isRead: false, createdAt: new Date().toISOString() },
    ]);
    const { getByText } = render(<NotificationsScreen />);
    fireEvent.press(getByText(/View post/i));
    expect(mockNavPush).toHaveBeenCalledWith({ pathname: '/post/[id]', params: { id: 'c-123' } });
  });

  it('watchlist_offer renders a "Redeem now" CTA', () => {
    resetState([
      { id: 'n1', type: 'watchlist_offer', title: 'Kashi Bakes dropped a deal', data: { offerId: 'o1' }, deepLink: null, isRead: false, createdAt: new Date().toISOString() },
    ]);
    const { getByText } = render(<NotificationsScreen />);
    expect(getByText(/Redeem now/i)).toBeTruthy();
  });
});
