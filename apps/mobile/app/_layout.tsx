import React, { useEffect, useState } from 'react';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PointsToast } from '../components/PointsToast';
import { useNotifications } from '../hooks/useNotifications';
import {
  startColdStartMeter,
  completeColdStartMeter,
} from '../lib/coldStartMeter';

// Capture the moment the JS bundle began running. The matching
// completeColdStartMeter() in the layout's first useEffect closes the
// stopwatch — the difference is what M5 reads via getColdStartDuration().
startColdStartMeter();

const NOTIFICATION_DEFER_MS = 800;

export default function RootLayout() {
  // expo-notifications loads native modules + makes a network call to
  // register the FCM token. On a cold boot that adds ~500ms before the
  // user sees any UI. We defer it past first-interactive instead.
  const [notificationsReady, setNotificationsReady] = useState(false);

  useEffect(() => {
    completeColdStartMeter();
    const handle = setTimeout(() => setNotificationsReady(true), NOTIFICATION_DEFER_MS);
    return () => clearTimeout(handle);
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <PointsToast />
      {notificationsReady ? <NotificationsInitializer /> : null}
    </View>
  );
}

function NotificationsInitializer() {
  useNotifications();
  return null;
}
