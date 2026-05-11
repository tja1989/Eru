import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizPlanTier } from '@eru/shared';

const TIERS: { key: BizPlanTier; label: string; price: string; features: string[] }[] = [
  { key: 'starter', label: 'Starter', price: '₹500 / campaign', features: ['1 pincode', 'Basic dashboard', 'Email support'] },
  { key: 'growth', label: 'Growth', price: '₹5,000 / month', features: ['5 pincodes', 'UGC boost', 'Audience analytics', 'Priority support'] },
  { key: 'pro', label: 'Pro', price: '₹12,000 / month', features: ['20 pincodes', 'Sponsored campaigns', 'Creator marketplace', 'Dedicated CSM'] },
];

export default function BizOnboardingPlans() {
  const router = useRouter();
  const [picked, setPicked] = useState<BizPlanTier | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!picked || saving) return;
    setSaving(true);
    try {
      await bizService.onboardingPlan(picked);
      router.push('/(biz)/onboarding/payment' as Href);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a plan</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {TIERS.map((t) => {
          const active = picked === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setPicked(t.key)}
              style={[styles.card, active && styles.cardActive]}
            >
              <Text style={[styles.tierLabel, active && styles.tierLabelActive]}>{t.label}</Text>
              <Text style={[styles.price, active && styles.priceActive]}>{t.price}</Text>
              {t.features.map((f) => (
                <Text key={f} style={[styles.feature, active && styles.featureActive]}>• {f}</Text>
              ))}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={[styles.btnPrimary, (!picked || saving) && styles.btnDisabled]}
        onPress={submit}
        disabled={!picked || saving}
      >
        <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  title: { fontSize: 22, fontWeight: '700', color: colors.g800 },
  list: { gap: spacing.md, paddingBottom: spacing.md },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.xs },
  cardActive: { borderColor: colors.navy, backgroundColor: colors.navy + '11' },
  tierLabel: { fontSize: 16, fontWeight: '700', color: colors.g800 },
  tierLabelActive: { color: colors.navy },
  price: { fontSize: 14, color: colors.g600 },
  priceActive: { color: colors.navy, fontWeight: '700' },
  feature: { fontSize: 12, color: colors.g600 },
  featureActive: { color: colors.g700 },
  btnPrimary: { backgroundColor: colors.navy, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
