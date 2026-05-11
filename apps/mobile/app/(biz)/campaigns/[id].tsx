import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizCampaign, BizCampaignStatus } from '@eru/shared';

function statusColor(status: BizCampaignStatus): string {
  switch (status) {
    case 'active': return colors.green;
    case 'completed': return colors.blue;
    case 'paused': return colors.orange;
    case 'draft':
    default: return colors.g400;
  }
}

function formatCurrency(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function BizCampaignDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<BizCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields, hydrated from `campaign` once it loads.
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [budgetText, setBudgetText] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    bizService.getCampaign(id)
      .then((c) => {
        if (cancelled) return;
        setCampaign(c);
        setTitle(c.title);
        setBody(c.body ?? '');
        setBudgetText(String(c.budget));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function onSave() {
    if (!campaign) return;
    setSaving(true);
    try {
      const updated = await bizService.updateCampaign(campaign.id, {
        title,
        body: body || undefined,
        budget: Number(budgetText) || 0,
      });
      setCampaign(updated);
      setEditing(false);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !campaign) {
    return (
      <View style={styles.center} testID="biz-campaign-detail-loading">
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  const isDraft = campaign.status === 'draft';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{editing ? 'Edit campaign' : campaign.title}</Text>
          <View style={[styles.badge, { borderColor: statusColor(campaign.status), backgroundColor: statusColor(campaign.status) + '22' }]}>
            <Text style={[styles.badgeText, { color: statusColor(campaign.status) }]}>{campaign.status.toUpperCase()}</Text>
          </View>
        </View>
        {isDraft && !editing ? (
          <TouchableOpacity style={styles.btnPrimary} onPress={() => setEditing(true)}>
            <Text style={styles.btnPrimaryText}>Edit</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {editing ? (
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={styles.fieldLabel}>Body</Text>
          <TextInput style={[styles.input, styles.multiline]} value={body} onChangeText={setBody} multiline />
          <Text style={styles.fieldLabel}>Budget (₹)</Text>
          <TextInput style={styles.input} value={budgetText} onChangeText={setBudgetText} keyboardType="numeric" />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setEditing(false)} disabled={saving}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={onSave} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Row label="Type" value={campaign.type.replace('_', ' ')} />
            {campaign.body ? <Row label="Body" value={campaign.body} /> : null}
            <Row label="Budget" value={formatCurrency(campaign.budget)} />
            <Row label="Spent" value={formatCurrency(campaign.spent)} />
            {campaign.startDate ? <Row label="Starts" value={new Date(campaign.startDate).toLocaleDateString()} /> : null}
            {campaign.endDate ? <Row label="Ends" value={new Date(campaign.endDate).toLocaleDateString()} /> : null}
            {campaign.pincodes.length > 0 ? <Row label="Target pincodes" value={campaign.pincodes.join(', ')} /> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Performance</Text>
            <View style={styles.kpiGrid}>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Impressions</Text><Text style={styles.kpiValue}>{campaign.impressions.toLocaleString('en-IN')}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Clicks</Text><Text style={styles.kpiValue}>{campaign.clicks.toLocaleString('en-IN')}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Claims</Text><Text style={styles.kpiValue}>{campaign.claims.toLocaleString('en-IN')}</Text></View>
              <View style={styles.kpi}><Text style={styles.kpiLabel}>Visits</Text><Text style={styles.kpiValue}>{campaign.storeVisits.toLocaleString('en-IN')}</Text></View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  headerLeft: { flex: 1, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '700', color: colors.g800 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.md },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  rowLabel: { fontSize: 13, color: colors.g500, flexShrink: 0 },
  rowValue: { fontSize: 13, color: colors.g800, flex: 1, textAlign: 'right' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kpi: { flexBasis: '48%', backgroundColor: colors.g100, padding: spacing.md, borderRadius: radius.sm },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: colors.g500, textTransform: 'uppercase' },
  kpiValue: { fontSize: 18, fontWeight: '700', color: colors.g800, marginTop: 2 },

  formCard: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.g600 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 14, color: colors.g800, backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },

  btnPrimary: { backgroundColor: colors.navy, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnGhost: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.g200 },
  btnGhostText: { color: colors.g700, fontSize: 14, fontWeight: '700' },
});
