import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

// Tells expo-router which tab is the cold-boot focus target. Combined with
// `lazy: true` below, only `index` runs its initial fetch on cold start;
// the other tabs mount on first navigation.
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabLayout() {
  const { initializing, isAuthenticated, needsHandleChoice } = useAuth();
  // SDK 54 enables Android edge-to-edge by default; the system nav bar would
  // otherwise overlap the tab row on Samsung phones. Reading insets.bottom
  // and growing the bar by that amount reserves a safe strip beneath the icons.
  const insets = useSafeAreaInsets();

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  // If the user somehow lands on tabs while still on a placeholder username
  // (e.g. pre-existing token from before this build shipped), bounce to
  // Personalize so they pick a real handle before they can post.
  if (needsHandleChoice) return <Redirect href="/(auth)/personalize" />;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: [
        styles.tabBar,
        { height: 56 + insets.bottom, paddingBottom: insets.bottom },
      ],
      tabBarActiveTintColor: colors.g800,
      tabBarInactiveTintColor: colors.g400,
      tabBarShowLabel: true,
      tabBarLabelStyle: styles.label,
      lazy: true,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🏠</Text> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔍</Text> }} />
      <Tabs.Screen name="create" options={{
        title: 'Create',
        tabBarIcon: () => <View style={styles.createBtn}><Text style={{ fontSize: 24, color: '#fff' }}>+</Text></View>,
        tabBarLabel: () => null,
      }} />
      <Tabs.Screen name="reels" options={{ title: 'Reels', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🎬</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👤</Text> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  tabBar: { height: 56, borderTopWidth: 0.5, borderTopColor: colors.g200, backgroundColor: '#fff' },
  label: { fontSize: 10, fontWeight: '600' },
  createBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: colors.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
});
