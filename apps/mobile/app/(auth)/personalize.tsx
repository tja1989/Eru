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
import {
  INTERESTS,
  LANGUAGES,
  PERSONALIZE_BONUS_THRESHOLD,
  PERSONALIZE_BONUS_POINTS,
} from '@eru/shared';
import { ProgressSteps } from '@/components/ProgressSteps';
import { userService } from '@/services/userService';
import { locationsService } from '@/services/locationsService';
import { colors } from '@/constants/theme';

export default function Personalize() {
  const router = useRouter();

  const [interests, setInterests] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(['en']);
  const [pincode, setPincode] = useState<string | null>(null);
  const [locality, setLocality] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
          const detected = geo[0]?.postalCode ?? null;
          setPincode(detected);
          // Reverse-lookup the locality name from our own pincode table so the
          // card reads "682016 • Ernakulam Central" (matches PWA line 357).
          // Silent failure — an unknown pincode just shows the raw number.
          if (detected) {
            try {
              const results = await locationsService.search(detected);
              const match = results.find((r) => r.pincode === detected) ?? results[0];
              if (match?.area) setLocality(match.area);
            } catch {
              // keep locality null; UI falls back to pincode-only
            }
          }
        }
      } catch {
        // ignore — banner shows fallback
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  const toggleInterest = (key: string) =>
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );

  const canContinue = interests.length >= PERSONALIZE_BONUS_THRESHOLD;
  const showBonus = interests.length >= PERSONALIZE_BONUS_THRESHOLD;

  const handleNext = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await userService.updateSettings({
        ...(pincode ? { primaryPincode: pincode } : {}),
        interests,
        contentLanguages: languages,
      });
      router.replace('/(auth)/tutorial');
    } catch (e: any) {
      // Non-blocking: log the error but still proceed to tutorial so the user
      // doesn't get trapped. They can edit these fields in Settings later.
      setSaveError(e?.response?.data?.error || 'Could not save preferences — you can edit in Settings later');
      router.replace('/(auth)/tutorial');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header — back / title / Skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personalize</Text>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/tutorial')}
          accessibilityRole="button"
          accessibilityLabel="Skip"
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressWrap}>
        <ProgressSteps current={2} total={4} caption="Step 2 of 4 • Tell us what you love" />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Location */}
        <Text style={styles.sectionTitle}>📍 Your location</Text>
        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Text style={styles.locationIconText}>📍</Text>
          </View>
          <View style={{ flex: 1 }}>
            {locationLoading ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : pincode ? (
              <>
                <Text style={styles.locationLine1}>
                  {pincode}{locality ? ` • ${locality}` : ''}
                </Text>
                {/* TODO(P+1): swap the static "Join the community" copy for a
                    live user-count once we have enough users per pincode that
                    the number (e.g. "12,000") reads credibly. Until then we
                    don't want to expose "3 Eru users here" during the pilot. */}
                <Text style={styles.locationLine2}>
                  Auto-detected via GPS • Join the community
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.locationLine1}>Location unavailable</Text>
                <Text style={styles.locationLine2}>Enter pincode in Settings later</Text>
              </>
            )}
          </View>
          <TouchableOpacity>
            <Text style={styles.changeLink}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Interests */}
        <Text style={styles.sectionTitle}>🎯 Pick 5+ interests</Text>
        <Text style={styles.sectionHint}>
          Personalises your feed. Earn 2x points on matched content.
        </Text>

        <View style={styles.pillsWrap}>
          {INTERESTS.map((item) => {
            const selected = interests.includes(item.key);
            const pillStyle = [
              styles.pill,
              selected && {
                backgroundColor: hexWithAlpha(item.color, 0.08),
                borderColor: item.color,
              },
            ];
            const textStyle = [styles.pillText, selected && { color: item.color, fontWeight: '600' as const }];
            return (
              <TouchableOpacity
                key={item.key}
                style={pillStyle}
                onPress={() => toggleInterest(item.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`interest-pill-${item.key}`}
              >
                <Text style={textStyle}>
                  {item.emoji} {item.label}{selected ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {showBonus && (
          <View style={styles.bonusBanner}>
            <Text style={styles.bonusText}>
              ✓ {interests.length} selected — unlocks +{PERSONALIZE_BONUS_POINTS} pts
            </Text>
          </View>
        )}

        {/* Languages */}
        <Text style={styles.sectionTitle}>🌐 Content languages</Text>
        <Text style={styles.sectionHint}>Select all languages you read or watch</Text>
        <View style={styles.pillsWrap}>
          {LANGUAGES.map(({ code, label }) => {
            const selected = languages.includes(code);
            return (
              <TouchableOpacity
                key={code}
                style={[
                  styles.pill,
                  styles.langPill,
                  selected && { backgroundColor: 'rgba(26,60,110,0.08)', borderColor: colors.navy },
                ]}
                onPress={() => toggleLanguage(code)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`lang-pill-${code}`}
              >
                <Text style={[styles.pillText, selected && { color: colors.navy, fontWeight: '600' as const }]}>
                  {label}{selected ? ' ✓' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}

        {/* Continue */}
        <TouchableOpacity
          testID="continue-btn"
          style={[styles.primary, (!canContinue || saving) && styles.primaryDisabled]}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue || saving }}
          disabled={!canContinue || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Next: How You Earn →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Tiny helper: convert "#RRGGBB" + alpha 0–1 to "rgba(r,g,b,a)" string.
function hexWithAlpha(hex: string, alpha: number): string {
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
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.g800,
    marginTop: 16,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    color: colors.g500,
    marginBottom: 10,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: 'rgba(13,148,136,0.05)',
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: 12,
    marginBottom: 4,
  },
  locationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationIconText: { fontSize: 16 },
  locationLine1: { fontSize: 13, fontWeight: '700', color: colors.g800 },
  locationLine2: { fontSize: 11, color: colors.g500 },
  changeLink: { fontSize: 11, color: colors.blue, fontWeight: '600' },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  // PWA language chips are slightly tighter than interest chips (PWA line 395).
  langPill: { paddingHorizontal: 13, paddingVertical: 7 },
  saveError: {
    fontSize: 11,
    color: colors.orange,
    marginTop: 12,
    textAlign: 'center',
  },
  pillText: {
    fontSize: 12,
    color: colors.g600 ?? colors.g500,
  },
  bonusBanner: {
    marginTop: 4,
    marginBottom: 8,
  },
  bonusText: {
    fontSize: 10,
    color: colors.green,
    fontWeight: '600',
  },
  primary: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
