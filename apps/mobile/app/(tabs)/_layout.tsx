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
      tabBarStyle: styles.tabBar,
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
