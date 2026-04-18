import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors, spacing, radius } from '../../constants/theme';

// ─── Data ────────────────────────────────────────────────────────────────────

const INTERESTS = [
  'Food', 'Travel', 'Sports', 'Fashion', 'Music', 'Gaming',
  'Tech', 'Movies', 'Books', 'Art', 'Fitness', 'Photography',
  'Beauty', 'DIY', 'Comedy', 'News',
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'bn', label: 'Bengali' },
  { code: 'mr', label: 'Marathi' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Personalize() {
  const router = useRouter();

  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [pincode, setPincode] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Try to get location on mount; silently ignore permission denial
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({});
          const geo = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          const pc = geo[0]?.postalCode ?? null;
          setPincode(pc);
        }
      } catch {
        // Location unavailable — no-op
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const toggleInterest = (item: string) =>
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );

  const canContinue = interests.length >= 3;
  const showBonus = interests.length === 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Personalize your feed</Text>
        <Text style={styles.sub}>Tell us a little about yourself so we can show you content you love.</Text>

        {/* ── Location / Pincode ── */}
        <View style={styles.pincodeRow}>
          <Text style={styles.pincodeLabel}>Your area</Text>
          {locationLoading ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : pincode ? (
            <Text style={styles.pincodeValue}>Pincode: {pincode}</Text>
          ) : (
            <Text style={styles.pincodeHint}>Location unavailable</Text>
          )}
        </View>

        {/* ── Interests ── */}
        <Text style={styles.sectionTitle}>Interests</Text>
        <Text style={styles.sectionHint}>Pick at least 3</Text>

        {showBonus && (
          <View style={styles.bonusBanner}>
            <Text style={styles.bonusText}>+50 pts for selecting 5 interests!</Text>
          </View>
        )}

        <View style={styles.pillsWrap}>
          {INTERESTS.map((item) => {
            const selected = interests.includes(item);
            return (
              <TouchableOpacity
                key={item}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleInterest(item)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Languages ── */}
        <Text style={styles.sectionTitle}>Content language</Text>
        <View style={styles.pillsWrap}>
          {LANGUAGES.map(({ code, label }) => {
            const selected = languages.includes(code);
            return (
              <TouchableOpacity
                key={code}
                style={[styles.pill, selected && styles.pillSelected]}
                onPress={() => toggleLanguage(code)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Continue ── */}
        <TouchableOpacity
          testID="continue-btn"
          style={[styles.primary, !canContinue && styles.primaryDisabled]}
          onPress={() => canContinue && router.push('/(auth)/tutorial')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
        >
          <Text style={styles.primaryText}>Continue</Text>
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
    lineHeight: 20,
  },

  pincodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    backgroundColor: colors.g100,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pincodeLabel: { fontWeight: '600', color: colors.g700 },
  pincodeValue: { color: colors.orange, fontWeight: '600' },
  pincodeHint: { color: colors.g400, fontStyle: 'italic' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.g800,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.g400,
    marginBottom: spacing.sm,
  },

  bonusBanner: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  bonusText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 14,
  },

  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  pill: {
    borderWidth: 1.5,
    borderColor: colors.g200,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.card,
  },
  pillSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orange,
  },
  pillText: {
    fontSize: 13,
    color: colors.g700,
    fontWeight: '500',
  },
  pillTextSelected: {
    color: colors.card,
  },

  primary: {
    backgroundColor: colors.orange,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  primaryDisabled: {
    backgroundColor: colors.g300,
  },
  primaryText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 16,
  },
});
