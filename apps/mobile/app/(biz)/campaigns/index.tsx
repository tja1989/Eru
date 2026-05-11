import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizCampaign, BizCampaignStatus } from '@eru/shared';

type Tab = { key: 'all' | BizCampaignStatus; label: string };
const TABS: Tab[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'draft', label: 'Draft' },
];

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

function CampaignCard({ c, onPress }: { c: BizCampaign; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{c.title}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(c.status) + '22', borderColor: statusColor(c.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(c.status) }]}>{c.status.toUpperCase()}</Text>
        </View>
      </View>
      {c.body ? <Text style={styles.cardBody} numberOfLines={2}>{c.body}</Text> : null}
      <View style={styles.statRow}>
        <View style={styles.stat}><Text style={styles.statLabel}>Budget</Text><Text style={styles.statValue}>{formatCurrency(c.budget)}</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Spent</Text><Text style={styles.statValue}>{formatCurrency(c.spent)}</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Impr.</Text><Text style={styles.statValue}>{c.impressions.toLocaleString('en-IN')}</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Visits</Text><Text style={styles.statValue}>{c.storeVisits.toLocaleString('en-IN')}</Text></View>
      </View>
    </TouchableOpacity>
  );
}

export default function BizCampaignsList() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab['key']>('all');
  const [items, setItems] = useState<BizCampaign[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const statusArg = tab === 'all' ? undefined : tab;
    bizService.getCampaigns(statusArg)
      .then((res) => { if (!cancelled) { setItems(res.items); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !items ? (
        <View style={styles.center} testID="biz-campaigns-loading">
          <ActivityIndicator size="large" color={colors.g400} />
        </View>
      ) : (items?.length ?? 0) === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No campaigns yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {items!.map((c) => (
            <CampaignCard
              key={c.id}
              c={c}
              onPress={() => router.push(`/(biz)/campaigns/${c.id}` as Href)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.g200 },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.g100 },
  tabActive: { backgroundColor: colors.navy },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.g600 },
  tabTextActive: { color: '#fff' },

  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.g800, flex: 1 },
  cardBody: { fontSize: 13, color: colors.g600 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  stat: { alignItems: 'flex-start' },
  statLabel: { fontSize: 10, color: colors.g400, fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 14, color: colors.g800, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  empty: { fontSize: 14, color: colors.g400, fontStyle: 'italic' },
});
