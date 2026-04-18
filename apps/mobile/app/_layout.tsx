import React from 'react';
import { Slot } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { PointsToast } from '../components/PointsToast';
import { useNotifications } from '../hooks/useNotifications';

export default function RootLayout() {
  // Auth gating lives inside (auth)/_layout.tsx and (tabs)/_layout.tsx via
  // <Redirect>. Keeping this layout dumb avoids the "navigate before Root
  // Layout mounts" race that happens when redirecting imperatively before
  // expo-router has registered the Slot as a navigator.
  // Mount the push-notification pipeline here so it runs for every
  // authenticated user exactly once, across the whole app lifetime.
  useNotifications();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <PointsToast />
    </View>
  );
}
