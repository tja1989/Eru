import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

// Placeholder for BD B6.2 — the real welcome screen lands then.
// Exists now so expo-router's typed-routes recognize the path that the
// (biz)/_layout gate redirects to.
export default function BizOnboardingWelcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your business</Text>
      <Text style={styles.subtitle}>This screen is coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.g800, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.g400 },
});
