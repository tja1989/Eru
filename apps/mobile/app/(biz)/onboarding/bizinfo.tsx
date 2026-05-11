import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';

export default function BizOnboardingBizInfo() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !category.trim() || pincode.length !== 6 || saving) return;
    setSaving(true);
    try {
      await bizService.onboardingSetup({
        name: name.trim(),
        category: category.trim(),
        pincode,
        address: address.trim() || undefined,
      });
      router.push('/(biz)/onboarding/pincodes' as Href);
    } catch (err) {
      Alert.alert('Setup failed', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setSaving(false);
    }
  }

  const ready = name.trim() && category.trim() && pincode.length === 6;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tell us about your business</Text>
      <TextInput style={styles.input} placeholder="Business name" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Category (e.g. cafe, salon, retail)" value={category} onChangeText={setCategory} />
      <TextInput
        style={styles.input}
        placeholder="Primary pincode (6 digits)"
        value={pincode}
        onChangeText={(v) => setPincode(v.replace(/[^0-9]/g, '').slice(0, 6))}
        keyboardType="numeric"
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Address (optional)"
        value={address}
        onChangeText={setAddress}
        multiline
      />
      <TouchableOpacity
        style={[styles.btnPrimary, (!ready || saving) && styles.btnDisabled]}
        onPress={submit}
        disabled={!ready || saving}
      >
        <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.g800, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 15, color: colors.g800, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  btnPrimary: { backgroundColor: colors.navy, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center', marginTop: spacing.md },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
