import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { ProgressSteps } from '@/components/ProgressSteps';
import { colors } from '@/constants/theme';

// PWA lines 437-471. 5 earning categories with EXACT copy + emoji + cap +
// bullets. Order preserved.
const EARN_CATEGORIES = [
  {
    emoji: '📖',
    label: 'Consume Content',
    cap: 'up to 170 pts/day',
    accent: colors.teal,
    bullets: 'Read article (+4) • Watch video (+6) • View reel (+3) • Listen podcast (+5) • Read thread (+3)',
  },
  {
    emoji: '💬',
    label: 'Engage',
    cap: 'up to 140 pts/day',
    accent: colors.orange,
    bullets: 'Like (+1) • Comment (+3) • Share (+2) • Save (+1) • Follow (+2)',
  },
  {
    emoji: '📊',
    label: 'Give Opinions',
    cap: 'up to 200 pts/day',
    accent: colors.purple,
    bullets: 'Vote poll (+5) • Short survey (+15) • Long survey (+40) • Review (+10) • Rate biz (+5)',
  },
  {
    emoji: '🛒',
    label: 'Shop & Claim',
    cap: 'up to 130 pts/day',
    accent: colors.green,
    bullets: 'View sponsored (+2) • Click CTA (+5) • Claim offer (+10) • Redeem QR (+25) • Purchase (+15)',
  },
  {
    emoji: '🚀',
    label: 'Big Wins',
    cap: 'bonus boosts',
    accent: colors.gold,
    bullets: 'Refer friend (+100) • Create post (+30) • Trending (+200) • Daily check-in (+25)',
  },
];

const TIER_TEASER = 'Explorer 1.0x → Engager 1.2x → Influencer 1.5x → Champion 2.0x. The more you engage, the faster you earn.';

export default function Tutorial() {
  const router = useRouter();
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  const handleStart = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How You Earn</Text>
        <TouchableOpacity onPress={handleStart} accessibilityLabel="Skip">
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressWrap}>
        <ProgressSteps current={4} total={4} caption="Step 4 of 4 • 193 pts/day average" />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Welcome bonus banner — purple gradient effect via solid w/ orange accent */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeLabel}>WELCOME BONUS</Text>
          <View style={styles.welcomeRow}>
            <Text style={styles.welcomePts}>+250</Text>
            <Text style={styles.welcomePtsLabel}>pts</Text>
          </View>
          <Text style={styles.welcomeSub}>= ₹2.50 already in your wallet! 🎉</Text>
        </View>

        <Text style={styles.section}>🪙 25 ways to earn every day</Text>

        {EARN_CATEGORIES.map((cat) => (
          <View key={cat.label} style={styles.card}>
            <View style={[styles.cardHead, { backgroundColor: hexAlpha(cat.accent, 0.05), borderBottomColor: hexAlpha(cat.accent, 0.1) }]}>
              <View style={styles.cardHeadLeft}>
                <Text style={styles.cardEmoji}>{cat.emoji}</Text>
                <Text style={[styles.cardLabel, { color: cat.accent }]}>{cat.label}</Text>
              </View>
              <Text style={styles.cardCap}>{cat.cap}</Text>
            </View>
            <Text style={styles.cardBullets}>{cat.bullets}</Text>
          </View>
        ))}

        {/* Tier teaser */}
        <View style={styles.tierCard}>
          <Text style={styles.tierTitle}>🔥 Level up your earnings</Text>
          <Text style={styles.tierBody}>{TIER_TEASER}</Text>
        </View>

        <TouchableOpacity
          style={styles.primary}
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel="Start Earning"
        >
          <Text style={styles.primaryText}>Start Earning 🚀</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Your first login earns you +25 pts (daily check-in)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  backIcon: { fontSize: 16, color: colors.g800 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.g800 },
  skipText: { fontSize: 12, color: colors.blue, fontWeight: '600' },
  progressWrap: {
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  body: { padding: 14 },
  welcomeBanner: {
    backgroundColor: '#1E1145',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  welcomeLabel: {
    color: colors.orange,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
  },
  welcomeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 },
  welcomePts: { color: '#fff', fontSize: 42, fontWeight: '800' },
  welcomePtsLabel: { color: colors.orange, fontSize: 16, fontWeight: '600' },
  welcomeSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.g800,
    marginBottom: 10,
  },
  card: {
    borderWidth: 0.5,
    borderColor: colors.g200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  cardHead: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardEmoji: { fontSize: 18 },
  cardLabel: { fontSize: 13, fontWeight: '700' },
  cardCap: { fontSize: 11, color: colors.g500 },
  cardBullets: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 11,
    color: colors.g600,
    lineHeight: 17,
  },
  tierCard: {
    marginTop: 8,
    backgroundColor: 'rgba(232,121,43,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232,121,43,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  tierTitle: { fontSize: 12, fontWeight: '700', color: colors.orange, marginBottom: 6 },
  tierBody: { fontSize: 11, color: colors.g600, lineHeight: 17 },
  primary: {
    backgroundColor: colors.orange,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  footer: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 10,
    color: colors.g400,
  },
});
