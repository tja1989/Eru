import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { signInWithCustomToken } from 'firebase/auth';
import { authService } from '@/services/authService';
import { whatsappAuthService } from '@/services/whatsappAuthService';
import { getFirebaseAuth } from '@/services/firebase';
import { useAuthStore } from '@/stores/authStore';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, verificationId, channel } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
    channel: string;
  }>();
  const isWhatsApp = channel === 'whatsapp';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  const full = digits.join('');
  const complete = full.length === 6 && digits.every((d) => d.length === 1);

  function onDigit(index: number, value: string) {
    const char = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < 5) inputs.current[index + 1]?.focus();
  }

  async function handleVerify() {
    if (!complete) return;
    if (!isWhatsApp && !verificationId) return;
    setSubmitting(true);
    setError(null);
    try {
      let idToken: string;
      if (isWhatsApp) {
        const customToken = await whatsappAuthService.verify(String(phone), full);
        const userCred = await signInWithCustomToken(getFirebaseAuth(), customToken);
        idToken = await userCred.user.getIdToken();
      } else {
        idToken = await authService.verifyOtpAndSignIn(
          String(verificationId),
          full,
        );
      }
      const registered = await authService.checkRegistered(idToken);
      if (registered) {
        useAuthStore.getState().setToken(idToken);
        router.replace('/(tabs)');
      } else {
        router.replace({
          pathname: '/(auth)/onboarding',
          params: { phone: String(phone ?? ''), token: idToken },
        });
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
    <View style={styles.root}>
      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code via {isWhatsApp ? 'WhatsApp' : 'SMS'} to {phone}
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
          <Text style={styles.verifyText}>Verify & Continue</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#262626' },
  subtitle: { color: '#737373', marginTop: 6, marginBottom: 24 },
  digitsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  digit: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderColor: '#DBDBDB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
    color: '#262626',
  },
  verify: {
    backgroundColor: '#1A3C6E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  verifyDisabled: { opacity: 0.4 },
  verifyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  error: { color: '#ED4956', marginBottom: 12 },
});
