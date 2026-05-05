import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

// Expo Go removed remote push support in SDK 53 — just IMPORTING the module
// triggers a fatal-looking "push notifications removed" console.error. Gate
// the import itself (Metro bundles the code either way; `require` defers the
// module's init side effects until we actually want them).
// Compared against the literal string so jest's expo-constants mock doesn't
// need to stub the `ExecutionEnvironment` enum.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

type NotificationsModule = typeof import('expo-notifications');
let Notifications: NotificationsModule | null = null;
if (!IS_EXPO_GO) {
  Notifications = require('expo-notifications') as NotificationsModule;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // expo-notifications 0.30+ replaced shouldShowAlert with the split
      // shouldShowBanner / shouldShowList pair. Keep the old key too for
      // older SDK consumers that still read it.
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

export function useNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  // The store exposes refresh() (full list + unread count); the local alias
  // keeps the old hook API surface so callers don't break.
  const refresh = useNotificationStore((s) => s.refresh);
  const refreshUnread = () => refresh();
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!Notifications) return;
    if (!isAuthenticated) return;
    registerForPushNotifications();
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const deepLink = response.notification.request.content.data?.deepLink;
      if (deepLink && typeof deepLink === 'string') {
        router.push(deepLink as any);
      }
    });
    return () => {
      // expo-notifications 0.30+ removed `removeNotificationSubscription`.
      // Subscriptions returned by addNotificationResponseReceivedListener now
      // expose a `.remove()` method instead.
      if (responseListener.current) responseListener.current.remove();
    };
  }, [isAuthenticated]);

  return { refreshUnread };
}

async function registerForPushNotifications() {
  if (!Notifications) return;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const tokenData = await Notifications.getExpoPushTokenAsync();
  try {
    await api.put('/users/me/settings', { fcmToken: tokenData.data });
  } catch {}
}
