import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { PointsToast } from '../components/PointsToast';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const { initializing, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  // Wait until expo-router has finished mounting its navigator before we try
  // to redirect — otherwise router.replace throws "Attempted to navigate
  // before mounting the Root Layout component".
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    if (initializing) return;
    if (!rootNavState?.key) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, initializing, segments, rootNavState?.key]);

  // Always render <Slot /> on first render so the navigator registers.
  // Overlay a spinner on top while auth is rehydrating from AsyncStorage.
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <PointsToast />
      {initializing && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator size="large" color={colors.g400} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
