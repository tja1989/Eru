import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '@/services/authService';
import { whatsappAuthService } from '@/services/whatsappAuthService';
import { signInWithCustomToken } from '@/services/firebase';
import {
  getPendingConfirmation,
  clearPendingConfirmation,
} from '@/services/pendingConfirmation';
import { useAuthStore } from '@/stores/authStore';
import { ProgressSteps } from '@/components/ProgressSteps';
import { colors } from '@/constants/theme';

const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const router = useRouter();
  const { phone, channel } = useLocalSearchParams<{
    phone: string;
    channel: string;
  }>();
  const isWhatsApp = channel === 'whatsapp';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState<number>(RESEND_SECONDS);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  // Resend countdown — ticks once per second; clamps at 0; user can resend after.
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const full = digits.join('');
  const complete = full.length === 6 && digits.every((d) => d.length === 1);

  function onDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) inputs.current[index + 1]?.focus();
    if (!char && index > 0) inputs.current[index - 1]?.focus();
  }

  async function handleResend() {
    if (resendIn > 0) return;
    setResendIn(RESEND_SECONDS);
    try {
      if (isWhatsApp) {
        await whatsappAuthService.send(String(phone));
      } else {
        // Firebase send-otp requires a recaptcha verifier on web; in app we
        // simply re-trigger the existing send. Stub out gracefully if unsupported.
        await (authService as any).requestOtp?.(String(phone));
      }
    } catch {
      // Resend errors are non-fatal — user can try the existing code or wait.
    }
  }

  async function handleVerify() {
    if (!complete) return;
    setSubmitting(true);
    setError(null);
    try {
      let idToken: string;
      let firebaseUid: string;
      if (isWhatsApp) {
        const customToken = await whatsappAuthService.verify(String(phone), full);
        const userCred = await signInWithCustomToken(customToken);
        idToken = await userCred.user.getIdToken();
        firebaseUid = userCred.user.uid;
      } else {
        // Native Firebase: confirm the pending phone-auth session with the
        // 6-digit code. The module-level ref was populated on /login.
        const confirmation = getPendingConfirmation();
        if (!confirmation) {
          throw new Error('Session expired — go back and re-send the code.');
        }
        const userCred = await confirmation.confirm(full);
        if (!userCred) throw new Error('Verification returned no user.');
        idToken = await userCred.user.getIdToken();
        firebaseUid = userCred.user.uid;
        clearPendingConfirmation();
      }

      // Attach the real Firebase ID token to axios before ANY user-scoped API
      // call. Everything downstream (checkRegistered, autoRegister, the feed
      // load on /(tabs)) relies on this token to authenticate.
      const store = useAuthStore.getState();
      store.setToken(idToken);

      const registered = await authService.checkRegistered(idToken);
      if (registered) {
        // Returning user — let the auth gate decide tutorial vs home based on
        // whether they've already claimed their welcome bonus. Also propagate
        // needsHandleChoice into the user object so the route gate can bounce
        // them to Personalize if they're still on a `pending_*` placeholder.
        try {
          const status = await authService.getOnboardingStatus();
          store.setOnboardingComplete(status.complete);
          const currentUser = store.user;
          if (currentUser) {
            store.setUser({ ...currentUser, needsHandleChoice: status.needsHandleChoice });
          }
          if (status.needsHandleChoice) {
            router.replace('/(auth)/personalize');
          } else {
            router.replace(status.complete ? '/(tabs)' : '/(auth)/personalize');
          }
        } catch {
          store.setOnboardingComplete(false);
          router.replace('/(auth)/personalize');
        }
      } else {
        // First-time user — silently create the Eru row keyed on the REAL
        // Firebase UID (not a synthesised dev-* placeholder) then enter the
        // personalize→tutorial flow. The server returns a `pending_*`
        // placeholder username; the user picks their real handle on the
        // Personalize screen.
        try {
          const result = await authService.autoRegister(firebaseUid, String(phone));
          // Store the user object so the route gate sees needsHandleChoice.
          if (result?.user) store.setUser(result.user);
        } catch (e: any) {
          // The register endpoint adopts a phone-collision silently, so 409
          // on username (rare — would require two phones colliding on the
          // same auto-generated username prefix) is the only real failure
          // shape. Surface it inline so the user can retry.
          throw new Error(
            e?.response?.data?.error || 'Could not create your account — try again.',
          );
        }
        // Re-assert the Firebase ID token on axios — belt-and-braces in case
        // any stray interceptor wiped it during the register round-trip.
        // Without this we'd navigate to /personalize with an empty Bearer
        // header and the first API call there (PATCH /users/me/settings)
        // would 401 → infinite loop back to /welcome.
        store.setToken(idToken);
        store.setOnboardingComplete(false);
        router.replace('/(auth)/personalize');
      }
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : '';
      setError(
        msg.toLowerCase().includes('invalid')
          ? 'Invalid code — try again'
          : msg || "Couldn't verify — try again",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Phone</Text>
        <View style={{ width: 16 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <ProgressSteps current={1} total={4} caption="Step 1 of 4" />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Enter 6-digit code</Text>
        <Text style={styles.subtitle}>
          We sent a code via {isWhatsApp ? 'WhatsApp' : 'SMS'} to {phone}
        </Text>

        <View style={styles.digitsRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              testID={`otp-digit-${i}`}
              value={d}
              onChangeText={(v) => onDigit(i, v)}
              keyboardType="number-pad"
              maxLength={1}
              style={styles.digit}
            />
          ))}
        </View>

        {/* Resend row */}
        <Text style={styles.resendRow}>
          Didn't receive?{' '}
          {resendIn > 0 ? (
            <Text style={styles.resendCounter}>Resend in {resendIn}s</Text>
          ) : (
            <Text style={styles.resendActive} onPress={handleResend} testID="otp-resend">
              Resend now
            </Text>
          )}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          testID="otp-verify"
          style={[styles.verify, !complete && styles.verifyDisabled]}
          disabled={!complete || submitting}
          accessibilityState={{ disabled: !complete || submitting }}
          onPress={handleVerify}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Verify & Continue →</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          By continuing you agree to Eru's <Text style={styles.legalLink}>Terms</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>. We never share your number with advertisers.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
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
  progressWrap: {
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  body: { padding: 16, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.g800 },
  subtitle: { color: colors.g500, marginTop: 6, marginBottom: 24 },
  digitsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  digit: {
    width: 46,
    height: 54,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.g800,
    backgroundColor: 'rgba(26,60,110,0.04)',
  },
  resendRow: { fontSize: 11, color: colors.g400, marginBottom: 16 },
  resendCounter: { color: colors.blue, fontWeight: '600' },
  resendActive: { color: colors.blue, fontWeight: '600' },
  verify: {
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  verifyDisabled: { opacity: 0.4 },
  verifyText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  error: { color: colors.red, marginBottom: 12 },
  legalText: {
    fontSize: 10,
    color: colors.g400,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 15,
  },
  legalLink: { color: colors.blue },
});
