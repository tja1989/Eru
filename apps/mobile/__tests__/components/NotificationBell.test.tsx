import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { NotificationBell } from '@/components/NotificationBell';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const mockUnread = jest.fn();
jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: (sel: any) => sel({ unreadCount: mockUnread() }),
}));

describe('<NotificationBell />', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUnread.mockReset();
  });

  it('renders the bell button (now an Ionicons glyph)', () => {
    mockUnread.mockReturnValue(0);
    const { getByLabelText } = render(<NotificationBell />);
    // Asserts the touchable is in the tree by its accessibility label.
    // Don't assert on the glyph itself — the icon library is an
    // implementation detail and the previous emoji-text assertion broke
    // when we swapped to <Ionicons />.
    expect(getByLabelText('Open notifications')).toBeTruthy();
  });

  it('does not render a badge when unreadCount=0', () => {
    mockUnread.mockReturnValue(0);
    const { queryByLabelText } = render(<NotificationBell />);
    expect(queryByLabelText(/unread count/i)).toBeNull();
  });

  it('renders the red unread badge with count when unreadCount>0', () => {
    mockUnread.mockReturnValue(5);
    const { getByLabelText, getByText } = render(<NotificationBell />);
    expect(getByLabelText(/unread count/i)).toBeTruthy();
    expect(getByText('5')).toBeTruthy();
  });

  it('renders 9+ when unreadCount > 9', () => {
    mockUnread.mockReturnValue(23);
    const { getByText } = render(<NotificationBell />);
    expect(getByText('9+')).toBeTruthy();
  });

  it('tapping navigates to /notifications', () => {
    mockUnread.mockReturnValue(0);
    const { getByLabelText } = render(<NotificationBell />);
    fireEvent.press(getByLabelText('Open notifications'));
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});
