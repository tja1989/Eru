import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { setAuthToken } from '../../services/api';
import { feedService } from '../../services/feedService';
import {
  isFirebaseConfigured,
  getFirebaseAuth,
  PhoneAuthProvider,
} from '../../services/firebase';
import { colors, spacing } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { setToken } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // If the Firebase config block in app.json still has placeholder values we
  // fall through to the dev-token bypass so the simulator / Expo Go flow keeps
  // working. Once real Firebase credentials are wired in, the OTP path engages
  // automatically without a code change.
  const firebaseReady = isFirebaseConfigured();

  const handleDevBypass = async (formattedPhone: string) => {
    const firebaseUid = 'dev-' + formattedPhone.replace(/[^0-9]/g, '');
    // Probe /wallet/summary with the dev token — 200 means the user exists,
    // 401 means we need to send them through onboarding.
    setAuthToken(firebaseUid);
    try {
      await feedService.getWalletSummary();
      setToken(firebaseUid);
    } catch (err: any) {
      setAuthToken(null);
      if (err?.response?.status === 401) {
        router.push({ pathname: '/(auth)/onboarding', params: { phone: formattedPhone } });
      } else {
        Alert.alert('Error', err?.response?.data?.error || err?.message || 'Login failed');
      }
    }
  };

  const handleFirebaseOtp = async (formattedPhone: string) => {
    // TODO: Firebase Phone Auth in Expo Go requires `expo-firebase-recaptcha`
    // for the web recaptcha modal. For production use a dev-client build with
    // the native Firebase SDK so verification is invisible. The second arg to
    // `verifyPhoneNumber` should be a FirebaseRecaptchaVerifierModal ref.
    const provider = new PhoneAuthProvider(getFirebaseAuth());
    const verificationId = await provider.verifyPhoneNumber(
      formattedPhone,
      undefined as any,
    );
    router.push({
      pathname: '/(auth)/otp',
      params: { phone: formattedPhone, verificationId },
    });
  };

  const handleLogin = async () => {
    if (!phone || phone.length < 10) return Alert.alert('Enter a valid phone number');
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      if (firebaseReady) {
        await handleFirebaseOtp(formattedPhone);
      } else {
        await handleDevBypass(formattedPhone);
      }
    } catch (error: any) {
      Alert.alert('Could not send code', error?.message ?? 'Please try again');
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Eru</Text>
      <Text style={styles.subtitle}>Your attention has value</Text>
      {!firebaseReady ? (
        <View style={styles.devBanner}>
          <Text style={styles.devBannerText}>
            Dev mode — OTP bypassed. Configure Firebase in app.json to enable SMS.
          </Text>
        </View>
      ) : null}
      <Text style={styles.label}>Phone number</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 9876543210"
        placeholderTextColor={colors.g400}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={15}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Continue'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.googleButton}>
        <Text style={styles.googleText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 48, fontWeight: '800', fontStyle: 'italic', color: colors.g800, textAlign: 'center', fontFamily: 'Georgia' },
  subtitle: { fontSize: 16, color: colors.g500, textAlign: 'center', marginBottom: 24, marginTop: 8 },
  devBanner: {
    backgroundColor: '#FFF4CE',
    borderColor: '#D4A017',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  devBannerText: { fontSize: 12, color: '#7A5C00', textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: colors.g800, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  googleButton: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.g700 },
});
