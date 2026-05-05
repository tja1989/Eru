// apps/mobile/app/(auth)/login.tsx
// IG-fidelity login.
//
// Replaces the prior multi-card phone-entry screen with IG's minimalist
// pattern: centered wordmark, single input, blue CTA, "Forgot password"
// link, divider, "Log in with Facebook"-style alternate (we re-task that
// row for WhatsApp). Bottom rail offers "Create new account".
//
// Eru is phone-first, so the input is the +91 phone field with a country
// pill (kept) instead of an email/username. WhatsApp toggle from the
// original is moved to a single inline link below "Forgot password".

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithPhoneNumber } from '../../services/firebase';
import { setPendingConfirmation } from '../../services/pendingConfirmation';
import { whatsappAuthService } from '../../services/whatsappAuthService';
import { colors } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [useWhatsApp, setUseWhatsApp] = useState(false);

  const normalize = (raw: string): string => {
    let d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return d.slice(0, 10);
  };
  const formatForDisplay = (d: string) => (d.length <= 5 ? d : `${d.slice(0, 5)} ${d.slice(5)}`);
  const digits = normalize(phone);
  const isValid = digits.length === 10;
  const handleChangePhone = (raw: string) => setPhone(formatForDisplay(normalize(raw)));

  const handleContinue = async () => {
    if (!isValid) { Alert.alert('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      const formattedPhone = `+91${digits}`;
      if (useWhatsApp) {
        await whatsappAuthService.send(formattedPhone);
        router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone, channel: 'whatsapp' } });
      } else {
        const confirmation = await signInWithPhoneNumber(formattedPhone);
        setPendingConfirmation(confirmation);
        router.push({ pathname: '/(auth)/otp', params: { phone: formattedPhone } });
      }
    } catch (e: any) {
      Alert.alert('Could not send code', e?.message ?? 'Please try again');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={{ flex: 1 }} />
        <Text style={styles.wordmark}>Eru</Text>

        <View style={styles.inputRow}>
          <View style={styles.countryPill}>
            <Text style={styles.countryFlag}>🇮🇳</Text>
            <Text style={styles.countryCode}>+91</Text>
          </View>
          <TextInput
            testID="phone-input"
            style={styles.phoneInput}
            placeholder="Mobile number"
            placeholderTextColor={colors.g500}
            keyboardType="number-pad"
            value={phone}
            onChangeText={handleChangePhone}
            maxLength={11}
            autoFocus
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
        </View>

        <TouchableOpacity
          style={[styles.primary, (!isValid || loading) && styles.primaryDisabled]}
          onPress={handleContinue}
          disabled={!isValid || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Log in</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setUseWhatsApp((v) => !v)} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={styles.linkBlue}>
            {useWhatsApp ? 'Use SMS instead' : 'Send code via WhatsApp'}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={styles.linkDark}>Trouble logging in?</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <View style={styles.signupRow}>
          <Text style={styles.signupQ}>Don't have an account? </Text>
          <TouchableOpacity><Text style={styles.signupLink}>Sign up.</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  body: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 16 },
  wordmark: {
    textAlign: 'center',
    fontSize: 56,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontWeight: '700',
    color: colors.g900,
    marginBottom: 36,
  },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  countryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.g200, borderRadius: 6,
    backgroundColor: colors.g50,
  },
  countryFlag: { fontSize: 14 },
  countryCode: { fontSize: 14, fontWeight: '500', color: colors.g800 },
  phoneInput: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.g200, borderRadius: 6,
    fontSize: 14, color: colors.g900, backgroundColor: colors.g50,
  },
  primary: {
    backgroundColor: colors.blue, paddingVertical: 11, borderRadius: 8,
    alignItems: 'center', marginTop: 8,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  linkBlue: { color: colors.link, fontSize: 12, fontWeight: '600' },
  linkDark: { color: colors.g700, fontSize: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.g200 },
  dividerText: { color: colors.g500, fontSize: 12, fontWeight: '600' },
  signupRow: {
    flexDirection: 'row', justifyContent: 'center',
    paddingTop: 14, paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.g200,
  },
  signupQ: { color: colors.g700, fontSize: 13 },
  signupLink: { color: colors.blue, fontSize: 13, fontWeight: '600' },
});
