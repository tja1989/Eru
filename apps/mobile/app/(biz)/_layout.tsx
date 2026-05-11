import React, { useEffect, useState } from 'react';
import { Tabs, Redirect, type Href } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { bizService } from '@/services/bizService';
import type { BizBusinessSummary } from '@eru/shared';

// Gate state machine:
//   initializing | loadingBiz → splash
//   not authed                → /(auth)/login
//   authed + business:null    → /(biz)/onboarding/welcome
//   authed + business present → tab layout (Overview / Campaigns / Create / UGC / Feedback)
//
// The bizService.getMe() call is the same handshake the API's GET /biz/me
// is designed for — null business signals "owner not yet onboarded".
type BizState =
  | { kind: 'loading' }
  | { kind: 'resolved'; business: BizBusinessSummary | null }
  | { kind: 'error' };

export default function BizLayout() {
  const { initializing, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<BizState>({ kind: 'loading' });

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    bizService.getMe()
      .then((res) => {
        if (!cancelled) setState({ kind: 'resolved', business: res.business });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  if (state.kind === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  // On error, treat as "no business yet" — onboarding is the safe fallback;
  // a network blip shouldn't dump an owner into a half-rendered dashboard.
  if (state.kind === 'error' || state.business === null) {
    // Href cast: the typed-routes generator emits the union from the
    // file system at build time; the onboarding/welcome path exists but
    // tsc still hits the partially-regenerated cache. Safe runtime route.
    return <Redirect href={'/(biz)/onboarding/welcome' as Href} />;
  }

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
      tabBarHideOnKeyboard: true,
      lazy: true,
    }}>
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns/index"
        options={{
          title: 'Campaigns',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'megaphone' : 'megaphone-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: () => (
            <View style={styles.createBtn}>
              <Ionicons name="add" size={26} color="#fff" />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="ugc"
        options={{
          title: 'UGC',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'images' : 'images-outline'} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="feedback"
        options={{
          title: 'Feedback',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  tabBar: { height: 56, borderTopWidth: 0.5, borderTopColor: colors.g200, backgroundColor: '#fff' },
  label: { fontSize: 10, fontWeight: '600' },
  createBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', marginBottom: 8, shadowColor: colors.orange, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 },
});
