import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { rewardsService, Reward, RewardStatus } from '@/services/rewardsService';
import { RewardCard } from '@/components/RewardCard';
import { colors, spacing, radius } from '@/constants/theme';

type Tab = RewardStatus | 'watchlist';

const TABS: { key: Tab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'watchlist', label: 'Watchlist' },
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
];

export default function MyRewardsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('active');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (status: RewardStatus) => {
    setLoading(true);
    try {
      const data = await rewardsService.list(status);
      setRewards(data);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch from the rewards API when the tab is a reward-status tab.
  // Watchlist is a synthetic tab sourced from /watchlist/deals (deferred).
  useEffect(() => {
    if (tab !== 'watchlist') {
      load(tab);
    } else {
      setLoading(false);
    }
  }, [tab, load]);

  async function handleUse(id: string) {
    try {
      await rewardsService.markUsed(id);
      await load(tab === 'watchlist' ? 'active' : tab);
      Alert.alert('Redeemed', 'Reward marked as used.');
    } catch (e: any) {
      Alert.alert('Could not redeem', e?.response?.data?.error ?? 'Try again');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Rewards</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              testID={`reward-tab-${t.key}`}
              accessibilityState={{ selected }}
              onPress={() => setTab(t.key)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {tab === 'watchlist' ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🏪</Text>
            <Text style={styles.placeholderTitle}>Stores you follow</Text>
            <Text style={styles.placeholderBody}>
              Live deals from businesses you've added to your watchlist will show up here. Follow
              your favourite stores from their storefront to get notified first.
            </Text>
          </View>
        ) : loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : rewards.length === 0 ? (
          <Text style={styles.empty}>No rewards yet</Text>
        ) : (
          rewards.map((r) => <RewardCard key={r.id} reward={r} onUse={handleUse} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  back: { fontSize: 22, color: colors.g800 },
  title: { fontSize: 16, fontWeight: '700', color: colors.g900 },
  tabs: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.g300,
  },
  tabActive: { backgroundColor: colors.g800, borderColor: colors.g800 },
  tabText: { color: colors.g700, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  list: { padding: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.g500 },
  placeholder: { padding: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  placeholderIcon: { fontSize: 48 },
  placeholderTitle: { fontSize: 15, fontWeight: '700', color: colors.g800 },
  placeholderBody: { fontSize: 13, color: colors.g500, textAlign: 'center', lineHeight: 18 },
});
