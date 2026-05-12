import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { PincodeMultiSelect } from '@/components/biz/PincodeMultiSelect';
import { bizService } from '@/services/bizService';

export default function BizOnboardingPincodes() {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (picked.length === 0 || saving) return;
    setSaving(true);
    try {
      await bizService.onboardingPincodes(picked);
      router.push('/(biz)/onboarding/plans' as Href);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Where do you want to reach?</Text>
      <Text style={styles.helper}>Pick the pincodes where your ads should appear.</Text>
      <PincodeMultiSelect value={picked} onChange={setPicked} />
      <TouchableOpacity
        style={[styles.btnPrimary, (picked.length === 0 || saving) && styles.btnDisabled]}
        onPress={submit}
        disabled={picked.length === 0 || saving}
      >
        <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.g800 },
  helper: { fontSize: 13, color: colors.g500, marginBottom: spacing.sm },
  btnPrimary: { backgroundColor: colors.blue, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
