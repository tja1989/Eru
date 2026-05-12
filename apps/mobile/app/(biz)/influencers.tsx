import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import { leaderboardService } from '@/services/leaderboardService';

interface Creator {
  id: string;
  username: string;
  name?: string;
  avatarUrl?: string | null;
  creatorScore?: number;
  points?: number;
  tier?: string;
}

// Score-band filter: lets owners narrow to creators by audience caliber.
type ScoreBand = 'all' | 'high' | 'mid' | 'rising';
const SCORE_BANDS: { key: ScoreBand; label: string; min: number; max: number }[] = [
  { key: 'all', label: 'All', min: 0, max: 100 },
  { key: 'high', label: '80+', min: 80, max: 100 },
  { key: 'mid', label: '60–79', min: 60, max: 79.99 },
  { key: 'rising', label: '<60', min: 0, max: 59.99 },
];

// Tier filter mirrors the consumer-app user tier enum so the data is
// always present without an extra API call.
type TierKey = 'all' | 'explorer' | 'creator';
const TIERS: { key: TierKey; label: string }[] = [
  { key: 'all', label: 'All tiers' },
  { key: 'creator', label: 'Creators' },
  { key: 'explorer', label: 'Explorers' },
];

export default function BizInfluencers() {
  const [pincode, setPincode] = useState<string | null>(null);
  const [items, setItems] = useState<Creator[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [scoreBand, setScoreBand] = useState<ScoreBand>('all');
  const [tier, setTier] = useState<TierKey>('all');

  useEffect(() => {
    let cancelled = false;
    bizService.getMe().then((me) => {
      if (cancelled) return;
      const p = me.business?.pincode ?? null;
      setPincode(p);
      if (!p) { setItems([]); setLoading(false); return; }
      leaderboardService.getLeaderboard('pincode', p)
        .then((res: any) => {
          if (cancelled) return;
          setItems(res.entries ?? []);
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Client-side filter — the underlying leaderboard endpoint doesn't take
  // these params, but the result set is small enough (top creators per
  // pincode) that filtering in-memory is cheap.
  const filtered = useMemo(() => {
    if (!items) return null;
    const band = SCORE_BANDS.find((b) => b.key === scoreBand)!;
    return items.filter((c) => {
      const score = c.creatorScore ?? 0;
      if (score < band.min || score > band.max) return false;
      if (tier !== 'all' && c.tier !== tier) return false;
      return true;
    });
  }, [items, scoreBand, tier]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filtersBar}>
        <Text style={styles.filterLabel}>Score</Text>
        <View style={styles.chipRow}>
          {SCORE_BANDS.map((b) => (
            <TouchableOpacity
              key={b.key}
              onPress={() => setScoreBand(b.key)}
              style={[styles.chip, scoreBand === b.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, scoreBand === b.key && styles.chipTextActive]}>{b.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.filterLabel}>Tier</Text>
        <View style={styles.chipRow}>
          {TIERS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTier(t.key)}
              style={[styles.chip, tier === t.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, tier === t.key && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {pincode ? <Text style={styles.heading}>Top creators in {pincode}</Text> : null}
        {(filtered ?? []).length === 0 ? (
          <Text style={styles.empty}>No creators match these filters</Text>
        ) : (filtered ?? []).map((c) => (
          <View key={c.id} style={styles.card}>
            <Text style={styles.username}>{c.username}</Text>
            {c.name ? <Text style={styles.name}>{c.name}</Text> : null}
            <View style={styles.metaRow}>
              {typeof c.creatorScore === 'number' ? <Text style={styles.meta}>Score: {c.creatorScore}</Text> : null}
              {typeof c.points === 'number' ? <Text style={styles.meta}>{c.points.toLocaleString('en-IN')} pts</Text> : null}
              {c.tier ? <Text style={styles.meta}>{c.tier}</Text> : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filtersBar: { padding: spacing.md, gap: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.g200, backgroundColor: '#fff' },
  filterLabel: { fontSize: 10, fontWeight: '700', color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg, backgroundColor: colors.g100 },
  chipActive: { backgroundColor: colors.blue },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.g600 },
  chipTextActive: { color: '#fff' },

  heading: { fontSize: 16, fontWeight: '700', color: colors.g800, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.xs },
  username: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  name: { fontSize: 12, color: colors.g500 },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  meta: { fontSize: 12, color: colors.g600 },

  empty: { fontSize: 14, color: colors.g400, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xl },
});
