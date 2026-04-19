import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { refreshUnread } = useNotificationStore();
  const responseListener = useRef<any>();

  useEffect(() => {
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
