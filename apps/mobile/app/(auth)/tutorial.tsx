import React, { useState } from 'react';
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
import { colors, spacing, radius } from '../../constants/theme';

// ─── Data ────────────────────────────────────────────────────────────────────

const EARN_CATEGORIES = [
  {
    label: 'Browse & Engage',
    bullets: [
      'Read a post — earn 2 pts',
      'Watch a reel to the end — earn 5 pts',
      'Like or comment — earn 1 pt each',
      'Share to WhatsApp — earn 3 pts',
      'Complete a poll — earn 4 pts',
    ],
  },
  {
    label: 'Create Content',
    bullets: [
      'Publish a text post — earn 10 pts',
      'Upload a reel — earn 20 pts',
      'Tag a local business — earn 15 pts',
      'Get a sponsored boost — earn commission',
    ],
  },
  {
    label: 'Daily Streaks',
    bullets: [
      '3-day streak — earn 25 pts',
      '7-day streak — earn 75 pts',
      '30-day streak — earn 400 pts',
      'Streak bonus multiplies all daily earnings',
    ],
  },
  {
    label: 'Quests',
    bullets: [
      'Weekly quests refresh every Monday',
      'Complete "Explore 5 Categories" — 30 pts',
      'Complete "React to 10 Posts" — 20 pts',
      '"First Reel" quest — 50 pts one-time bonus',
    ],
  },
  {
    label: 'Trade-In',
    bullets: [
      'Refer a friend who joins — 100 pts',
      'Redeem old loyalty points from partner apps',
      'Trade physical receipts for digital points',
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Tutorial() {
  const router = useRouter();
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);

  // Track which card index is expanded; null means all collapsed
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleCard = (index: number) =>
    setExpandedIndex((prev) => (prev === index ? null : index));

  const handleStart = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.heading}>How you earn</Text>
        <Text style={styles.sub}>Every interaction puts points in your pocket.</Text>

        {/* ── Welcome Bonus Banner ── */}
        <View style={styles.welcomeBanner}>
          <Text style={styles.welcomeLabel}>Welcome bonus</Text>
          <Text style={styles.welcomePoints}>+250 pts</Text>
          <Text style={styles.welcomeSub}>credited on your first login 🎉</Text>
        </View>

        {/* ── Earning Category Cards ── */}
        {EARN_CATEGORIES.map((cat, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <TouchableOpacity
              key={cat.label}
              style={styles.card}
              onPress={() => toggleCard(index)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isExpanded }}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>{cat.label}</Text>
                <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
              </View>
              {isExpanded && (
                <View testID={`card-bullets-${index}`} style={styles.bullets}>
                  {cat.bullets.map((b) => (
                    <Text key={b} style={styles.bullet}>
                      • {b}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── Start Earning CTA ── */}
        <TouchableOpacity
          style={styles.primary}
          onPress={handleStart}
          accessibilityRole="button"
          accessibilityLabel="Start Earning"
        >
          <Text style={styles.primaryText}>Start Earning 🚀</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.card },
  root: { padding: spacing.xxl, flexGrow: 1 },

  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.g900,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: 14,
    color: colors.g500,
    marginBottom: spacing.xl,
  },

  welcomeBanner: {
    backgroundColor: colors.orange,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  welcomeLabel: {
    color: colors.card,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  welcomePoints: {
    color: colors.card,
    fontSize: 36,
    fontWeight: '900',
  },
  welcomeSub: {
    color: colors.card,
    fontSize: 12,
    marginTop: spacing.xs,
    opacity: 0.9,
  },

  card: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.g800,
  },
  chevron: {
    color: colors.g400,
    fontSize: 12,
  },
  bullets: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  bullet: {
    color: colors.g600,
    fontSize: 13,
    lineHeight: 20,
  },

  primary: {
    backgroundColor: colors.orange,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 16,
  },
});
