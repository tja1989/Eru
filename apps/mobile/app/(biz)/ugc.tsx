import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizUgcContentItem, BizUgcResponse } from '@eru/shared';

function Card({ item, onBoost }: { item: BizUgcContentItem; onBoost: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.author}>@{item.authorUsername}</Text>
        {item.isSponsored ? (
          <View style={[styles.badge, { borderColor: colors.green, backgroundColor: colors.green + '22' }]}>
            <Text style={[styles.badgeText, { color: colors.green }]}>SPONSORED</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardText}>{item.text}</Text>
      {!item.isSponsored ? (
        <TouchableOpacity style={styles.btnPrimary} onPress={onBoost}>
          <Text style={styles.btnPrimaryText}>Boost</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function BizUgc() {
  const [data, setData] = useState<BizUgcResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    bizService.getUgc()
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onBoost = (contentId: string) => {
    Alert.prompt(
      'Boost this content',
      'How much do you want to spend on this boost? (₹)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Boost',
          onPress: async (input?: string) => {
            const amount = Number(input);
            if (!amount || amount <= 0) {
              Alert.alert('Invalid amount', 'Enter a positive number.');
              return;
            }
            try {
              await bizService.boostUgc(contentId, amount);
              Alert.alert('Boost sent', 'The creator will be notified to accept.');
              load();
            } catch (err) {
              Alert.alert('Boost failed', err instanceof Error ? err.message : 'Try again later');
            }
          },
        },
      ],
      'plain-text',
      '500',
      'numeric',
    );
  };

  if (loading && !data) {
    return (
      <View style={styles.center} testID="biz-ugc-loading">
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }
  if (!data) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        <View style={styles.stat}><Text style={styles.statLabel}>Tagged</Text><Text style={styles.statValue}>{data.stats.tagged}</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Sponsored</Text><Text style={styles.statValue}>{data.stats.sponsored}</Text></View>
        <View style={styles.stat}><Text style={styles.statLabel}>Reach</Text><Text style={styles.statValue}>{data.stats.reachEstimate.toLocaleString('en-IN')}</Text></View>
      </View>

      <Text style={styles.sectionTitle}>New tags</Text>
      {data.newTags.length === 0 ? (
        <Text style={styles.empty}>No new tagged content</Text>
      ) : data.newTags.map((item) => (
        <Card key={item.id} item={item} onBoost={() => onBoost(item.id)} />
      ))}

      <Text style={styles.sectionTitle}>Active sponsorships</Text>
      {data.activeSponsorships.length === 0 ? (
        <Text style={styles.empty}>No active sponsorships</Text>
      ) : data.activeSponsorships.map((item) => (
        <Card key={item.id} item={item} onBoost={() => onBoost(item.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: { flex: 1, backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100 },
  statLabel: { fontSize: 11, fontWeight: '600', color: colors.g400, textTransform: 'uppercase' },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.g800, marginTop: spacing.xs },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.g800, marginTop: spacing.md },
  empty: { fontSize: 13, color: colors.g400, fontStyle: 'italic' },

  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  author: { fontSize: 13, fontWeight: '700', color: colors.g800 },
  cardText: { fontSize: 14, color: colors.g700 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  btnPrimary: { backgroundColor: colors.navy, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm, alignSelf: 'flex-start' },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
