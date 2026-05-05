// apps/mobile/app/(auth)/welcome.tsx
// IG-fidelity welcome.
//
// Pure-IG welcome is *minimalist*: white screen, centered wordmark, two
// buttons stacked. We adapt that frame to Eru:
//   • White background (replaces the navy/orange gradient)
//   • Centered "Eru" wordmark (script italic — same role as IG's
//     Instagram wordmark; replace with a real SVG asset later)
//   • Primary "Log in" button — IG blue, full width
//   • Secondary "Create new account" — text-only blue link
//
// All emoji value-prop cards from the prior design are removed; if you
// need to convey value, use a paginated splash carousel BEFORE this
// screen — IG itself does this with three illustration slides.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={{ flex: 1 }} />
        <Text style={styles.wordmark}>Eru</Text>
        <View style={{ flex: 1 }} />

        <View style={styles.ctas}>
          <TouchableOpacity
            style={styles.primary}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Log in</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.push('/(auth)/login')}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Create new account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>from <Text style={{ fontWeight: '700' }}>Eru</Text></Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { flex: 1, paddingHorizontal: 28, paddingBottom: 24 },
  wordmark: {
    textAlign: 'center',
    fontSize: 56,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.g900,
  },
  ctas: { gap: 12 },
  primary: {
    backgroundColor: colors.blue,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  secondary: { paddingVertical: 12, alignItems: 'center' },
  secondaryText: { color: colors.blue, fontWeight: '600', fontSize: 14 },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 12, color: colors.g500 },
});
