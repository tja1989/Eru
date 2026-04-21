import { Stack, Redirect, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/theme';

// Routes that a not-yet-onboarded user is allowed to be on. Rendering them
// must NOT trigger another redirect to welcome, otherwise tapping Get Started
// bounces straight back to welcome (the gate redirects /login → /welcome
// because login wasn't in this set).
const ONBOARDING_ROUTES = new Set([
  'welcome',
  'login',
  'otp',
  'onboarding',
  'personalize',
  'tutorial',
]);

export default function AuthLayout() {
  const { initializing, isAuthenticated, hasCompletedOnboarding } = useAuth();
  const segments = useSegments();
  // Within the (auth) group, the last segment is the current screen name
  // (e.g. 'welcome', 'login'). Group segments like '(auth)' are filtered out.
  const currentRoute = segments[segments.length - 1];
  const onOnboardingRoute = ONBOARDING_ROUTES.has(currentRoute);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  // Authenticated users who haven't finished onboarding (e.g. killed the app
  // after login but before the tutorial) land on the tutorial page — they
  // already have a token so the welcome/login flow would loop them.
  // Skip the redirect if they're already on an onboarding route.
  if (isAuthenticated && !hasCompletedOnboarding && !onOnboardingRoute) {
    return <Redirect href="/(auth)/tutorial" />;
  }

  if (isAuthenticated && hasCompletedOnboarding) return <Redirect href="/(tabs)" />;

  // First-time users who haven't completed onboarding go to the welcome screen,
  // unless they're already somewhere in the onboarding flow.
  if (!hasCompletedOnboarding && !onOnboardingRoute) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="personalize" />
      <Stack.Screen name="tutorial" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
