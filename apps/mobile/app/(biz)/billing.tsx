import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizBillingResponse } from '@eru/shared';

function formatCurrency(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}₹${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function BizBilling() {
  const [data, setData] = useState<BizBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    bizService.getBilling()
      .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }
  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Plan</Text>
        {data.currentTier ? (
          <>
            <Text style={styles.tierLabel}>{data.currentTier.toUpperCase()}</Text>
            <Text style={styles.tierMeta}>Monthly cap: {formatCurrency(data.monthlyCapAmount)}</Text>
            <Text style={styles.tierMeta}>Spent this month: {formatCurrency(data.spentThisMonth)}</Text>
          </>
        ) : (
          <Text style={styles.empty}>No plan yet — pick one to start running campaigns.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Balance</Text>
        <Text style={styles.balance}>{formatCurrency(data.remaining)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        {data.transactions.length === 0 ? (
          <Text style={styles.empty}>No transactions yet.</Text>
        ) : data.transactions.map((t) => (
          <View key={t.id} style={styles.txRow}>
            <View style={styles.txMain}>
              <Text style={styles.txKind}>{t.kind}</Text>
              {t.note ? <Text style={styles.txNote}>{t.note}</Text> : null}
            </View>
            <View style={styles.txRight}>
              <Text style={[styles.txAmount, { color: t.amount < 0 ? colors.red : colors.green }]}>{formatCurrency(t.amount)}</Text>
              <Text style={styles.txDate}>{formatDate(t.createdAt)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierLabel: { fontSize: 22, fontWeight: '700', color: colors.navy },
  tierMeta: { fontSize: 13, color: colors.g600 },
  balance: { fontSize: 28, fontWeight: '700', color: colors.g800 },

  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.g100 },
  txMain: { flex: 1 },
  txKind: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  txNote: { fontSize: 11, color: colors.g500 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txDate: { fontSize: 11, color: colors.g500 },

  empty: { fontSize: 13, color: colors.g500, fontStyle: 'italic' },
});
