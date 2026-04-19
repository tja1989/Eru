import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

// Expo Go removed remote push support in SDK 53. Touching the push APIs in
// that environment emits a fatal-looking error overlay in dev. Detect it once
// and skip the native side entirely — everything except push will still work.
// Compared against the literal string so the test env doesn't need to stub
// the `ExecutionEnvironment` enum from expo-constants.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

if (!IS_EXPO_GO) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: false,
      shouldSetBadge: true,
    }),
  });
}

export function useNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { refreshUnread } = useNotificationStore();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (IS_EXPO_GO) return;
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
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
  const tokenData = await Notifications.getExpoPushTokenAsync();
  try {
    await api.put('/users/me/settings', { fcmToken: tokenData.data });
  } catch {}
}
