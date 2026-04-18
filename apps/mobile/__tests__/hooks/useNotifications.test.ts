import { renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { useNotifications } from '@/hooks/useNotifications';
import api from '@/services/api';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
}));

jest.mock('@/services/api', () => ({
  __esModule: true,
  default: { put: jest.fn() },
}));

// Mutable authenticated flag — individual tests flip it to simulate the
// logged-out state without resetting the module registry (resetting
// modules breaks React's singleton and causes "Invalid hook call").
let mockIsAuthenticated = true;
jest.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ isAuthenticated: mockIsAuthenticated }),
}));

jest.mock('@/stores/notificationStore', () => ({
  useNotificationStore: () => ({ refreshUnread: jest.fn() }),
}));

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
  });

  it('requests permission, captures the Expo push token, and PUTs it to /users/me/settings when authenticated', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExponentPushToken[xxxxx]' });

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(api.put).toHaveBeenCalledWith('/users/me/settings', { fcmToken: 'ExponentPushToken[xxxxx]' });
    });
  });

  it('does NOT request permission when user is not authenticated', async () => {
    mockIsAuthenticated = false;

    renderHook(() => useNotifications());

    await new Promise((r) => setTimeout(r, 50));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('skips the PUT when permission is denied', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    renderHook(() => useNotifications());

    await new Promise((r) => setTimeout(r, 50));
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });
});
