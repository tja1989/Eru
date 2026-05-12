import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';

export default function BizOnboardingWelcome() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Grow your business on Yeru</Text>
        <Text style={styles.subtitle}>
          Reach Kerala customers with sponsored content, targeted offers,
          and live UGC-driven campaigns. Setup takes about a minute.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.btnPrimary}
        onPress={() => router.push('/(biz)/onboarding/bizinfo' as Href)}
      >
        <Text style={styles.btnPrimaryText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.xl, backgroundColor: colors.bg, justifyContent: 'space-between' },
  hero: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { fontSize: 28, fontWeight: '700', color: colors.g800 },
  subtitle: { fontSize: 15, color: colors.g600, lineHeight: 22 },
  btnPrimary: { backgroundColor: colors.blue, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
