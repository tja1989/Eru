import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizAudienceBucket, BizAudienceResponse } from '@eru/shared';

function BucketSection({ title, buckets }: { title: string; buckets: BizAudienceBucket[] }) {
  if (buckets.length === 0) return null;
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {buckets.map((b) => (
        <View key={b.label} style={styles.row}>
          <Text style={styles.label}>{b.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { width: `${(b.count / max) * 100}%` }]} />
          </View>
          <Text style={styles.count}>{b.count}</Text>
        </View>
      ))}
    </View>
  );
}

export default function BizAudience() {
  const [data, setData] = useState<BizAudienceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    bizService.getAudience()
      .then((res) => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.center} testID="biz-audience-loading">
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }
  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BucketSection title="Age" buckets={data.ageBuckets} />
      <BucketSection title="Top pincodes" buckets={data.topPincodes} />
      <BucketSection title="Top interests" buckets={data.topInterests} />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Peak hours (IST)</Text>
        <View style={styles.peakRow}>
          {data.peakHours.map((v, i) => {
            const max = Math.max(1, ...data.peakHours);
            return (
              <View key={i} style={styles.peakCol}>
                <View style={[styles.peakBar, { height: Math.max(2, (v / max) * 60) }]} />
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.g800 },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { fontSize: 12, color: colors.g600, width: 80 },
  count: { fontSize: 13, color: colors.g800, fontWeight: '700', width: 40, textAlign: 'right' },
  barTrack: { flex: 1, height: 10, backgroundColor: colors.g100, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { height: '100%', backgroundColor: colors.navy, borderRadius: radius.sm },

  peakRow: { flexDirection: 'row', height: 60, alignItems: 'flex-end', gap: 2 },
  peakCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  peakBar: { width: '80%', backgroundColor: colors.orange, borderRadius: 1 },
});
