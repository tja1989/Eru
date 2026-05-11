import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizQrScanResponse } from '@eru/shared';

// Manual claim-code entry for B5.4. Camera-based scanning (expo-camera /
// CameraView) is a follow-up once `expo install expo-camera` lands; the
// API surface is identical so swapping the input layer is a one-screen
// change.
export default function BizQrScan() {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BizQrScanResponse | null>(null);

  async function submit() {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await bizService.scanQr(code.trim());
      setResult(res);
      setCode('');
    } catch (err) {
      Alert.alert('Scan failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Redeemed</Text>
        <Text style={styles.row}>{result.reward.offerTitle}</Text>
        <Text style={styles.row}>@{result.reward.username}</Text>
        {result.campaignEventId ? <Text style={styles.row}>Visit logged to campaign</Text> : null}
        <TouchableOpacity style={styles.btnPrimary} onPress={() => setResult(null)}>
          <Text style={styles.btnPrimaryText}>Scan next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem a reward</Text>
      <Text style={styles.helper}>Enter the customer's claim code from their QR.</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="CLAIM-CODE"
        autoCapitalize="characters"
      />
      <TouchableOpacity
        style={[styles.btnPrimary, (!code.trim() || submitting) && styles.btnDisabled]}
        onPress={submit}
        disabled={!code.trim() || submitting}
      >
        <Text style={styles.btnPrimaryText}>{submitting ? 'Redeeming…' : 'Redeem'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },

  title: { fontSize: 20, fontWeight: '700', color: colors.g800 },
  helper: { fontSize: 13, color: colors.g500 },
  row: { fontSize: 14, color: colors.g700 },

  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 16, color: colors.g800, backgroundColor: '#fff' },

  btnPrimary: { backgroundColor: colors.navy, padding: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
