import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';

export default function BizOnboardingPayment() {
  const router = useRouter();
  const [amountText, setAmountText] = useState('1000');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const amount = Number(amountText);
    if (!amount || amount <= 0 || submitting) return;
    setSubmitting(true);
    try {
      await bizService.onboardingPayment(amount);
      router.replace('/(biz)/overview' as Href);
    } catch (err) {
      Alert.alert('Top up failed', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top up your account</Text>
      <Text style={styles.helper}>
        This is a mock top-up for the pilot. Real card / UPI payment is wired
        once the gateway integration ships.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Amount (₹)"
        value={amountText}
        onChangeText={(v) => setAmountText(v.replace(/[^0-9]/g, ''))}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={[styles.btnPrimary, submitting && styles.btnDisabled]}
        onPress={submit}
        disabled={submitting}
      >
        <Text style={styles.btnPrimaryText}>{submitting ? 'Processing…' : 'Top up'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.g800 },
  helper: { fontSize: 13, color: colors.g500, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 18, fontWeight: '700', color: colors.g800, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: colors.blue, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
