import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';

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
      tabBarActiveTintColor: colors.g800,
      tabBarInactiveTintColor: colors.g400,
      tabBarShowLabel: true,
      tabBarLabelStyle: styles.label,
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
