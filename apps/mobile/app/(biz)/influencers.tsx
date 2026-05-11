import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
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
}

export default function BizInfluencers() {
  const [pincode, setPincode] = useState<string | null>(null);
  const [items, setItems] = useState<Creator[] | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {pincode ? <Text style={styles.heading}>Top creators in {pincode}</Text> : null}
      {(items ?? []).length === 0 ? (
        <Text style={styles.empty}>No creators found</Text>
      ) : (items ?? []).map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.username}>{c.username}</Text>
          {c.name ? <Text style={styles.name}>{c.name}</Text> : null}
          <View style={styles.metaRow}>
            {typeof c.creatorScore === 'number' ? <Text style={styles.meta}>Score: {c.creatorScore}</Text> : null}
            {typeof c.points === 'number' ? <Text style={styles.meta}>{c.points.toLocaleString('en-IN')} pts</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heading: { fontSize: 16, fontWeight: '700', color: colors.g800, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.xs },
  username: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  name: { fontSize: 12, color: colors.g500 },
  metaRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  meta: { fontSize: 12, color: colors.g600 },

  empty: { fontSize: 14, color: colors.g400, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xl },
});
