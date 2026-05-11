import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { WizardStepper } from '@/components/biz/WizardStepper';
import { PincodeMultiSelect } from '@/components/biz/PincodeMultiSelect';
import { bizService } from '@/services/bizService';
import type { BizCampaignType } from '@eru/shared';

const STEPS = ['Content', 'Target', 'Budget', 'Review'];

const CAMPAIGN_TYPES: { key: BizCampaignType; label: string }[] = [
  { key: 'promotion', label: 'Promotion' },
  { key: 'brand_awareness', label: 'Brand Awareness' },
  { key: 'new_launch', label: 'New Launch' },
  { key: 'event', label: 'Event' },
  { key: 'review_request', label: 'Review Request' },
];

interface WizardState {
  type: BizCampaignType;
  title: string;
  body: string;
  imageUrl: string;
  pincodes: string[];
  budgetText: string;
}

const initialState: WizardState = {
  type: 'promotion',
  title: '',
  body: '',
  imageUrl: '',
  pincodes: [],
  budgetText: '500',
};

export default function BizCreate() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [launching, setLaunching] = useState(false);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  // Per-step validation: each step exposes "can I advance?" to the Next button.
  function canAdvance(): boolean {
    switch (step) {
      case 0: return state.title.trim().length > 0;
      case 1: return state.pincodes.length > 0;
      case 2: return Number(state.budgetText) > 0;
      case 3: return true;
      default: return false;
    }
  }

  function onNext() {
    if (!canAdvance()) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else onFinish();
  }

  function onBack() {
    if (step > 0) setStep(step - 1);
  }

  async function onFinish() {
    if (launching) return;
    setLaunching(true);
    try {
      const created = await bizService.createCampaign({
        type: state.type,
        title: state.title.trim(),
        body: state.body.trim() || undefined,
        imageUrl: state.imageUrl.trim() || undefined,
        pincodes: state.pincodes,
        budget: Number(state.budgetText) || 0,
      });
      await bizService.launchCampaign(created.id);
      router.push('/(biz)/campaigns' as Href);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Try again later';
      Alert.alert('Launch failed', msg);
    } finally {
      setLaunching(false);
    }
  }

  return (
    <View style={styles.container}>
      <WizardStepper steps={STEPS} current={step} />
      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Content</Text>
            <Text style={styles.fieldLabel}>Campaign type</Text>
            <View style={styles.typeRow}>
              {CAMPAIGN_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => update('type', t.key)}
                  style={[styles.typeChip, state.type === t.key && styles.typeChipActive]}
                >
                  <Text style={[styles.typeChipText, state.type === t.key && styles.typeChipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Catchy title for your ad"
              value={state.title}
              onChangeText={(v) => update('title', v)}
            />
            <Text style={styles.fieldLabel}>Body</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="What's the offer? Keep it short."
              value={state.body}
              onChangeText={(v) => update('body', v)}
              multiline
            />
            <Text style={styles.fieldLabel}>Image URL (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              value={state.imageUrl}
              onChangeText={(v) => update('imageUrl', v)}
              autoCapitalize="none"
            />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Target your audience</Text>
            <Text style={styles.fieldLabel}>Reach pincodes</Text>
            <PincodeMultiSelect
              value={state.pincodes}
              onChange={(v) => update('pincodes', v)}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <Text style={styles.fieldLabel}>Total budget (₹)</Text>
            <TextInput
              style={styles.input}
              value={state.budgetText}
              onChangeText={(v) => update('budgetText', v.replace(/[^0-9]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={styles.helper}>Debited on Launch. Refunds are not yet supported.</Text>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Review</Text>
            <Row label="Type" value={state.type.replace('_', ' ')} />
            <Row label="Title" value={state.title} />
            {state.body ? <Row label="Body" value={state.body} /> : null}
            <Row label="Pincodes" value={state.pincodes.join(', ') || '—'} />
            <Row label="Budget" value={`₹${state.budgetText}`} />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={onBack}
          disabled={step === 0}
          style={[styles.btnGhost, step === 0 && styles.btnDisabled]}
        >
          <Text style={styles.btnGhostText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onNext}
          disabled={!canAdvance() || launching}
          style={[styles.btnPrimary, (!canAdvance() || launching) && styles.btnDisabled]}
        >
          <Text style={styles.btnPrimaryText}>
            {step === STEPS.length - 1 ? (launching ? 'Launching…' : 'Launch') : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 100 },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.g800, marginBottom: spacing.xs },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.g600, marginTop: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 14, color: colors.g800, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  helper: { fontSize: 12, color: colors.g500, marginTop: spacing.xs },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.g100 },
  typeChipActive: { backgroundColor: colors.navy },
  typeChipText: { fontSize: 12, fontWeight: '600', color: colors.g600 },
  typeChipTextActive: { color: '#fff' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.xs },
  rowLabel: { fontSize: 12, color: colors.g500 },
  rowValue: { fontSize: 13, color: colors.g800, flex: 1, textAlign: 'right', fontWeight: '600' },

  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg, borderTopWidth: 0.5, borderTopColor: colors.g200, backgroundColor: '#fff', gap: spacing.md },
  btnPrimary: { flex: 1, backgroundColor: colors.navy, padding: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnGhost: { flex: 1, padding: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.g200, alignItems: 'center' },
  btnGhostText: { color: colors.g700, fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
