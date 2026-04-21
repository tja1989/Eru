import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

const VALUE_PROPS = [
  {
    emoji: '🪙',
    iconBg: 'rgba(16,185,129,0.2)',
    title: 'Earn real rewards',
    body: '25 earning actions. 193 pts/day avg.',
  },
  {
    emoji: '🎁',
    iconBg: 'rgba(232,121,43,0.2)',
    title: 'Redeem locally',
    body: '500+ partner stores. Free coffee, discounts, gifts.',
  },
  {
    emoji: '✍️',
    iconBg: 'rgba(124,58,237,0.25)',
    title: 'Create & get paid',
    body: 'Tag businesses, earn 20% commission on boosted posts.',
  },
];

export default function Welcome() {
  const router = useRouter();

  return (
    <LinearGradient
      colors={['#1E1145', '#2D1B69', '#E8792B']}
      locations={[0, 0.4, 1.5]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.root}>
          {/* Logo block */}
          <View style={styles.logoOuter}>
            <View style={styles.logoFrosted}>
              <Text style={styles.logoE}>E</Text>
            </View>
          </View>

          {/* Tagline + headline */}
          <View style={styles.headlineBlock}>
            <Text style={styles.tagline}>Consume. Earn. Connect.</Text>
            <Text style={styles.headline}>
              Your attention{'\n'}
              <Text style={styles.headlineEmphasis}>has value.</Text>
            </Text>
            <Text style={styles.subTagline}>
              India's first super content app where every scroll, share, and review earns you real rewards.
            </Text>
          </View>

          {/* Value-prop cards */}
          <View style={styles.cards}>
            {VALUE_PROPS.map((v) => (
              <View key={v.title} style={styles.card}>
                <View style={[styles.iconTile, { backgroundColor: v.iconBg }]}>
                  <Text style={styles.emoji}>{v.emoji}</Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{v.title}</Text>
                  <Text style={styles.cardBodyText}>{v.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* CTAs */}
          <View style={styles.ctas}>
            <TouchableOpacity
              style={styles.primary}
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel="Get Started"
            >
              <Text style={styles.primaryText}>Get Started →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondary}
              onPress={() => router.push('/(auth)/login')}
              accessibilityRole="button"
              accessibilityLabel="I already have an account"
            >
              <Text style={styles.secondaryText}>I already have an account</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>🇮🇳 Made in Kerala • 500 pincodes live</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  root: { paddingHorizontal: 24, paddingVertical: 40, flexGrow: 1, justifyContent: 'space-between' },
  logoOuter: { alignItems: 'center', marginTop: 30 },
  logoFrosted: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoE: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 42, fontWeight: '700', color: '#fff' },
  headlineBlock: { alignItems: 'center', marginTop: 36 },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    color: colors.orange,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 14,
    lineHeight: 36,
    textAlign: 'center',
  },
  headlineEmphasis: {
    color: colors.orange,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  subTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  cards: { marginTop: 32, gap: 10 },
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '700', fontSize: 13, color: '#fff' },
  cardBodyText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  ctas: { marginTop: 32 },
  primary: {
    backgroundColor: colors.orange,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: {
    marginTop: 10,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  footer: {
    textAlign: 'center',
    marginTop: 14,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
});
