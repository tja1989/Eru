// apps/mobile/app/(tabs)/_layout.tsx
// IG-fidelity tab bar.
//   • White bar, 50px tall, hairline top border
//   • 5 tabs: Home, Search, Create (+ outlined square), Reels, Profile
//   • Active = solid black icon, inactive = outlined gray
//   • NO labels (IG hides them on mobile)
//   • Center "Create" is the same shape as other tabs — NO orange disc

import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

export const unstable_settings = { initialRouteName: 'index' };

// Glyph icons — switch to lucide / SF Symbols / @expo/vector-icons later;
// these match IG's stroke style at 26pt with `fontWeight 200/700` for
// active/inactive distinction.
const TabIcon = ({ glyph, active }: { glyph: string; active: boolean }) => (
  <Text style={{ fontSize: 26, color: active ? colors.g900 : colors.g600, fontWeight: active ? '700' : '300' }}>
    {glyph}
  </Text>
);

export default function TabLayout() {
  const { initializing, isAuthenticated } = useAuth();
  // Android phones with gesture navigation reserve a bottom inset; without
  // adding it to the tab bar, the system gesture bar sits ON TOP of our
  // icons. Lifting the bar by `insets.bottom` keeps the icons reachable on
  // every device shape (iPhone with home indicator, Android with gestures,
  // Android with 3-button nav, iPad).
  const insets = useSafeAreaInsets();

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        ...styles.tabBar,
        height: 50 + insets.bottom,
        paddingBottom: insets.bottom,
      },
      tabBarActiveTintColor: colors.g900,
      tabBarInactiveTintColor: colors.g600,
      tabBarShowLabel: false,
      lazy: true,
    }}>
      <Tabs.Screen name="index" options={{ tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" active={focused} /> }} />
      <Tabs.Screen name="explore" options={{ tabBarIcon: ({ focused }) => <TabIcon glyph="⌕" active={focused} /> }} />
      <Tabs.Screen name="create" options={{ tabBarIcon: ({ focused }) => <TabIcon glyph="⊞" active={focused} /> }} />
      <Tabs.Screen name="reels" options={{ tabBarIcon: ({ focused }) => <TabIcon glyph="▶" active={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon glyph="○" active={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    height: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.g200,
    backgroundColor: '#fff',
  },
});
