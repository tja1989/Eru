import { Stack, Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/theme';

export default function AuthLayout() {
  const { initializing, isAuthenticated, hasCompletedOnboarding } = useAuth();

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
  if (isAuthenticated && !hasCompletedOnboarding) return <Redirect href="/(auth)/tutorial" />;

  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  // First-time users who haven't completed onboarding go to the welcome screen.
  if (!hasCompletedOnboarding) return <Redirect href="/(auth)/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
