import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../hooks/useAuth';
import { PointsToast } from '../components/PointsToast';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function RootLayout() {
  const { initializing, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, initializing, segments]);

  if (initializing) return <LoadingSpinner />;

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Slot />
      <PointsToast />
    </View>
  );
}
