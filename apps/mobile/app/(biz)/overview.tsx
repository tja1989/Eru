import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizDashboardPeriod, BizDashboardResponse } from '@eru/shared';

const PERIODS: { key: BizDashboardPeriod; label: string }[] = [
  { key: 'week', label: '7d' },
  { key: 'month', label: '30d' },
  { key: '90d', label: '90d' },
];

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

function formatCurrency(n: number): string {
  return `₹${formatNumber(Math.round(n))}`;
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

function BarChart({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  return (
    <View style={styles.chart}>
      {data.map((v, i) => (
        <View key={i} style={styles.barColumn}>
          <View style={[styles.bar, { height: Math.max(2, (v / max) * 100) }]} />
        </View>
      ))}
    </View>
  );
}

export default function BizOverview() {
  const [period, setPeriod] = useState<BizDashboardPeriod>('week');
  const [data, setData] = useState<BizDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bizService.getDashboard(period)
      .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  if (loading && !data) {
    return (
      <View style={styles.loading} testID="biz-overview-loading">
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Dashboard</Text>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            onPress={() => setPeriod(p.key)}
            style={[styles.periodChip, period === p.key && styles.periodChipActive]}
          >
            <Text style={[styles.periodChipText, period === p.key && styles.periodChipTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.kpiGrid}>
        <KpiTile label="Impressions" value={formatNumber(data.kpis.impressions)} />
        <KpiTile label="Clicks" value={formatNumber(data.kpis.clicks)} sub={`CTR ${(data.kpis.ctr * 100).toFixed(1)}%`} />
        <KpiTile label="Claims" value={formatNumber(data.kpis.claims)} />
        <KpiTile label="Visits" value={formatNumber(data.kpis.visits)} sub={formatCurrency(data.kpis.costPerVisit) + '/visit'} />
        <KpiTile label="Spent" value={formatCurrency(data.kpis.spent)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Impressions (last 7 days)</Text>
        <BarChart data={data.dailyImpressions} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer sentiment</Text>
        <View style={styles.sentimentRow}>
          <View style={styles.sentimentItem}>
            <Text style={[styles.sentimentLabel, { color: colors.green }]}>Positive</Text>
            <Text style={styles.sentimentValue}>{data.sentiment.positive}</Text>
          </View>
          <View style={styles.sentimentItem}>
            <Text style={[styles.sentimentLabel, { color: colors.g500 }]}>Neutral</Text>
            <Text style={styles.sentimentValue}>{data.sentiment.neutral}</Text>
          </View>
          <View style={styles.sentimentItem}>
            <Text style={[styles.sentimentLabel, { color: colors.red }]}>Negative</Text>
            <Text style={styles.sentimentValue}>{data.sentiment.negative}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent activity</Text>
        {data.recentActivity.length === 0 ? (
          <Text style={styles.empty}>No activity yet</Text>
        ) : (
          data.recentActivity.map((a, i) => (
            <View key={i} style={styles.activityRow}>
              <Text style={styles.activityMessage}>{a.message}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  heading: { fontSize: 24, fontWeight: '700', color: colors.g800 },

  periodRow: { flexDirection: 'row', gap: spacing.sm },
  periodChip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.g100 },
  periodChipActive: { backgroundColor: colors.blue },
  periodChipText: { fontSize: 13, fontWeight: '600', color: colors.g600 },
  periodChipTextActive: { color: '#fff' },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '48%', backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100 },
  tileLabel: { fontSize: 11, fontWeight: '600', color: colors.g400, textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontSize: 22, fontWeight: '700', color: colors.g800, marginTop: spacing.xs },
  tileSub: { fontSize: 11, color: colors.g500, marginTop: spacing.xs },

  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.md },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.g800 },

  chart: { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: spacing.xs },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '70%', backgroundColor: colors.g800, borderRadius: radius.sm },

  sentimentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  sentimentItem: { alignItems: 'center', flex: 1 },
  sentimentLabel: { fontSize: 12, fontWeight: '600' },
  sentimentValue: { fontSize: 20, fontWeight: '700', color: colors.g800, marginTop: spacing.xs },

  activityRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  activityMessage: { fontSize: 13, color: colors.g700 },

  empty: { fontSize: 13, color: colors.g400, fontStyle: 'italic' },
});
