import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

export default function Personalize() {
  const router = useRouter();
  const storeUser = useAuthStore((s) => s.user);
  const setStoreUser = useAuthStore((s) => s.setUser);

  // Treat the auto-register placeholder "New User" as empty so the field
  // doesn't pre-fill with meaningless filler. Returning users who already
  // picked a real name see it pre-filled and don't need to retype.
  const initialName = storeUser?.name && storeUser.name !== 'New User' ? storeUser.name : '';
  const [name, setName] = useState<string>(initialName);
  // Handle: empty if the stored value is still a server-side placeholder, so
  // the user has to actively pick one. Returning users with a real handle
  // see it pre-filled and just hit Continue.
  const initialHandle = storeUser?.username && !storeUser.username.startsWith('pending_') ? storeUser.username : '';
  const [handle, setHandle] = useState<string>(initialHandle);
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    initialHandle ? 'available' : 'idle',
  );
  const [handleError, setHandleError] = useState<string | null>(null);
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

  // Sync needsHandleChoice from server on mount. The route guard at
  // (auth)/_layout reads this flag out of the local Zustand store. If the
  // local copy is stale (any earlier success/failure path forgot to clear
  // it, or a prior APK shipped a buggy clear), the user gets bounced right
  // back here on every navigation. Pulling server truth on entry breaks the
  // loop: when this fetch resolves, the surrounding layout re-evaluates with
  // the fresh value and — if the server says we no longer need Personalize —
  // forwards the user on without a tap.
  useEffect(() => {
    let cancelled = false;
    authService
      .getOnboardingStatus()
      .then((status) => {
        if (cancelled) return;
        const current = useAuthStore.getState().user;
        if (current) {
          useAuthStore
            .getState()
            .setUser({ ...current, needsHandleChoice: status.needsHandleChoice });
        }
      })
      .catch(() => {
        // Silent — offline or server hiccup just means we keep the current
        // local value. No regression vs. before; user simply misses the
        // self-heal on this entry.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced live availability check on the handle. 400ms feels responsive
  // without firing a request on every keystroke. The check ALSO surfaces
  // validator failures (reserved word, bad chars, leading period, etc.) via
  // the `reason` field — that's what `invalid` status represents.
  useEffect(() => {
    if (handle.length === 0) {
      setHandleStatus('idle');
      setHandleError(null);
      return;
    }
    // Same handle as already on the user — skip the API call.
    if (handle === initialHandle) {
      setHandleStatus('available');
      setHandleError(null);
      return;
    }
    setHandleStatus('checking');
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await userService.checkHandleAvailable(handle);
        if (cancelled) return;
        if (res.available) {
          setHandleStatus('available');
          setHandleError(null);
        } else if (res.reason) {
          setHandleStatus('invalid');
          setHandleError(res.reason);
        } else {
          setHandleStatus('taken');
          setHandleError('Already taken — try another');
        }
      } catch {
        if (cancelled) return;
        setHandleStatus('invalid');
        setHandleError('Could not check availability');
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [handle, initialHandle]);

  const toggleInterest = (key: string) =>
    setInterests((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
    );

  const trimmedName = name.trim();
  const canContinue =
    trimmedName.length > 0 &&
    interests.length >= PERSONALIZE_BONUS_THRESHOLD &&
    handleStatus === 'available';
  const showBonus = interests.length >= PERSONALIZE_BONUS_THRESHOLD;

  const handleNext = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sendUsername = !!(handle && handle !== initialHandle);
      const result = await userService.updateSettings({
        name: trimmedName,
        // Only send username if it's actually changing — sending the same
        // value back fires the unique-constraint check needlessly.
        ...(sendUsername ? { username: handle } : {}),
        ...(pincode ? { primaryPincode: pincode } : {}),
        interests,
        contentLanguages: languages,
      });
      // Sync local store from the server's authoritative response. The PUT
      // returns the post-update settings including needsHandleChoice (server
      // performs an idempotent sweep — clears it whenever the user has a real
      // non-pending username). Writing the server's value back, rather than
      // hard-coding `false`, keeps the local route-guard cache truthful even
      // for edge cases we haven't enumerated.
      if (storeUser) {
        setStoreUser({
          ...storeUser,
          name: trimmedName,
          ...(sendUsername ? { username: handle } : {}),
          needsHandleChoice: result?.settings?.needsHandleChoice ?? false,
        });
      }
      router.replace('/(auth)/tutorial');
    } catch (e: any) {
      // Username collision (409) must NOT proceed — the user has to pick
      // another. Surface the error and stop. Other errors are non-blocking
      // (location, interests, etc. can be edited in Settings later).
      const status = e?.response?.status;
      const msg = e?.response?.data?.error;
      if (status === 409) {
        setHandleStatus('taken');
        setHandleError(msg || 'Username already taken');
        setSaveError(null);
      } else {
        setSaveError(msg || 'Could not save preferences — you can edit in Settings later');
        router.replace('/(auth)/tutorial');
      }
    } finally {
      setSaving(false);
    }
  };

  // Skip route — bypasses interests/languages but MUST still persist the
  // chosen handle. Without this, hitting Skip with a `pending_*` placeholder
  // would leave the user on it, and the route gate would bounce them back.
  const handleSkip = async () => {
    if (handleStatus !== 'available' || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const sendUsername = !!(handle && handle !== initialHandle);
      let serverFlag: boolean | undefined;
      if (sendUsername) {
        const result = await userService.updateSettings({ username: handle });
        serverFlag = result?.settings?.needsHandleChoice;
      }
      // Mirror handleNext: when the server replied with the post-update value
      // for needsHandleChoice, write that. When we didn't call the server
      // (handle unchanged), the mount-time onboarding-status sync has already
      // refreshed the local cache, so we just clear conservatively here.
      if (storeUser) {
        setStoreUser({
          ...storeUser,
          ...(sendUsername ? { username: handle } : {}),
          needsHandleChoice: serverFlag ?? false,
        });
      }
      router.push('/(auth)/tutorial');
    } catch (e: any) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.error;
      if (status === 409) {
        setHandleStatus('taken');
        setHandleError(msg || 'Username already taken');
      } else {
        setSaveError(msg || 'Could not save handle');
      }
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
        {/* Skip bypasses interest/language selection but NOT the handle.
            Disabled until the handle is valid + available; keeps the user
            from leaving on a `pending_*` placeholder. */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={handleStatus !== 'available' || saving}
          accessibilityRole="button"
          accessibilityLabel="Skip"
          accessibilityState={{ disabled: handleStatus !== 'available' || saving }}
        >
          <Text style={[styles.skipText, (handleStatus !== 'available' || saving) && { opacity: 0.3 }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressWrap}>
        <ProgressSteps current={2} total={4} caption="Step 2 of 4 • Tell us what you love" />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Name — captured here rather than in a separate screen so onboarding
            stays 4 steps. Required; drives follow/search discoverability in
            Explore since the phone-derived username alone isn't memorable. */}
        <Text style={styles.sectionTitle}>👤 Your name</Text>
        <Text style={styles.sectionHint}>So friends can find you in Explore</Text>
        <TextInput
          testID="name-input"
          style={styles.nameInput}
          placeholder="Full name"
          placeholderTextColor={colors.g400}
          value={name}
          onChangeText={setName}
          maxLength={100}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
        />

        {/* Handle — required and Instagram-style. Continue is gated on a
            valid + available handle so users never post under a placeholder. */}
        <Text style={styles.sectionTitle}>@ Your handle</Text>
        <Text style={styles.sectionHint}>
          How friends find and tag you. 3–30 chars; lowercase letters, numbers, _ or .
        </Text>
        <View style={styles.handleRow}>
          <Text style={styles.atPrefix}>@</Text>
          <TextInput
            testID="handle-input"
            style={styles.handleInput}
            placeholder="yourname"
            placeholderTextColor={colors.g400}
            value={handle}
            onChangeText={(t) => setHandle(t.toLowerCase().trim())}
            maxLength={30}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
          />
          {handleStatus === 'checking' && <ActivityIndicator size="small" color={colors.teal} />}
          {handleStatus === 'available' && <Text style={styles.handleOk}>✓</Text>}
          {(handleStatus === 'taken' || handleStatus === 'invalid') && (
            <Text style={styles.handleErr}>✗</Text>
          )}
        </View>
        {handleError ? <Text style={styles.handleErrText}>{handleError}</Text> : null}

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
  nameInput: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.g800,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  atPrefix: {
    fontSize: 16,
    color: colors.g500,
    fontWeight: '600',
    marginRight: 4,
  },
  handleInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    fontSize: 16,
    color: colors.g800,
  },
  handleOk: { fontSize: 16, color: colors.green, fontWeight: '700' },
  handleErr: { fontSize: 16, color: colors.orange, fontWeight: '700' },
  handleErrText: {
    fontSize: 11,
    color: colors.orange,
    marginTop: 2,
    marginBottom: 4,
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
