import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signInWithPhoneNumber } from '../../services/firebase';
import { setPendingConfirmation } from '../../services/pendingConfirmation';
import { whatsappAuthService } from '../../services/whatsappAuthService';
import { ProgressSteps } from '../../components/ProgressSteps';
import { colors } from '../../constants/theme';

// Matches Eru_Consumer_PWA.html #screen-otp (lines 292-337). The PWA visually
// merges phone entry + 6-digit code on one screen; the native app splits them
// into /login (this) and /otp so we can funnel a real Firebase confirmation
// result through setPendingConfirmation between them. The chrome — header,
// step-1-of-4 progress bar, navy CTA, legal text — matches the PWA so the
// two screens read as a single "Verify Phone" flow.
export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [useWhatsApp, setUseWhatsApp] = useState(false);

  const handleWhatsAppOtp = async (formattedPhone: string) => {
    await whatsappAuthService.send(formattedPhone);
    router.push({
      pathname: '/(auth)/otp',
      params: { phone: formattedPhone, channel: 'whatsapp' },
    });
  };

  const handleFirebaseOtp = async (formattedPhone: string) => {
    // Native SDK — Play Integrity (Android) or APNs silent push (iOS) handle
    // verification invisibly. ConfirmationResult stashed in a module-level ref
    // because expo-router's typed routes can't serialise a Firebase object
    // through search params.
    const confirmation = await signInWithPhoneNumber(formattedPhone);
    setPendingConfirmation(confirmation);
    router.push({
      pathname: '/(auth)/otp',
      params: { phone: formattedPhone },
    });
  };

  // Strip anything that isn't a digit. If the user typed a 12-digit number
  // starting with 91 (the country code), drop the prefix so we always submit
  // a clean 10-digit body. Also drop a leading 0 (India's STD-style prefix).
  const normalize = (raw: string): string => {
    let d = raw.replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return d.slice(0, 10);
  };

  // Display "98432 15678" with a single space after 5 digits. Cosmetic only —
  // normalize() strips the space before we submit.
  const formatForDisplay = (d: string) => (d.length <= 5 ? d : `${d.slice(0, 5)} ${d.slice(5)}`);

  const digits = normalize(phone);
  const isValid = digits.length === 10;

  const handleChangePhone = (raw: string) => setPhone(formatForDisplay(normalize(raw)));

  const handleContinue = async () => {
    if (!isValid) {
      Alert.alert('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = `+91${digits}`;
      if (useWhatsApp) {
        await handleWhatsAppOtp(formattedPhone);
      } else {
        await handleFirebaseOtp(formattedPhone);
      }
    } catch (error: any) {
      Alert.alert('Could not send code', error?.message ?? 'Please try again');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Phone</Text>
        <View style={{ width: 16 }} />
      </View>

      {/* Step 1 of 4 progress */}
      <View style={styles.progressWrap}>
        <ProgressSteps current={1} total={4} caption="Step 1 of 4" />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your mobile number</Text>
        <Text style={styles.subtitle}>We'll send a one-time password to verify</Text>

        {/* Country pill + phone input */}
        <View style={styles.inputRow}>
          <View style={styles.countryPill}>
            <Text style={styles.countryFlag}>🇮🇳</Text>
            <Text style={styles.countryCode}>+91</Text>
          </View>
          <TextInput
            testID="phone-input"
            style={styles.phoneInput}
            placeholder="98432 15678"
            placeholderTextColor={colors.g400}
            keyboardType="number-pad"
            value={phone}
            onChangeText={handleChangePhone}
            maxLength={11}
            autoFocus
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
        </View>
        {/* Tiny helper so users know what to type — the +91 pill already
            shows the country code, so we don't want them to type it again. */}
        <Text style={styles.helperText}>
          Enter your 10-digit mobile number. We've already set +91 for you.
        </Text>

        {/* WhatsApp toggle card — teal-tinted per PWA line 317 */}
        <TouchableOpacity
          testID="whatsapp-toggle"
          style={styles.toggleCard}
          onPress={() => setUseWhatsApp((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: useWhatsApp }}
        >
          <View style={[styles.toggleTrack, useWhatsApp && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, useWhatsApp && styles.toggleThumbActive]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Send via WhatsApp</Text>
            <Text style={styles.toggleSubtitle}>Faster delivery. No SMS needed.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.continueBtn, (!isValid || loading) && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Verify and continue"
          accessibilityState={{ disabled: !isValid || loading }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueText}>Verify &amp; Continue →</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.legalText}>
          By continuing you agree to Eru's <Text style={styles.legalLink}>Terms</Text> and{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>. We never share your number with
          advertisers.
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
  subtitle: { fontSize: 13, color: colors.g500, marginTop: 4, marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 8 },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 10,
    backgroundColor: colors.g50,
  },
  countryFlag: { fontSize: 16 },
  countryCode: { fontSize: 14, fontWeight: '600', color: colors.g800 },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: 10,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.g800,
  },
  helperText: { marginTop: 8, fontSize: 11, color: colors.g500 },
  toggleCard: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16,185,129,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(16,185,129,0.15)',
    borderRadius: 10,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.g200,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: { backgroundColor: colors.green },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    // alignSelf flips on active — approximates the PWA thumb sliding right.
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  toggleTitle: { fontSize: 12, fontWeight: '600', color: colors.g800 },
  toggleSubtitle: { fontSize: 10, color: colors.g500, marginTop: 2 },
  continueBtn: {
    marginTop: 24,
    paddingVertical: 14,
    backgroundColor: colors.navy,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  legalText: {
    marginTop: 16,
    fontSize: 10,
    color: colors.g400,
    textAlign: 'center',
    lineHeight: 15,
  },
  legalLink: { color: colors.blue },
});
