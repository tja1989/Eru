import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { rewardsService, Reward, RewardStatus } from '@/services/rewardsService';
import { RewardCard } from '@/components/RewardCard';

const TABS: { key: RewardStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'used', label: 'Used' },
  { key: 'expired', label: 'Expired' },
];

export default function MyRewardsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<RewardStatus>('active');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: RewardStatus) => {
    setLoading(true);
    try {
      const data = await rewardsService.list(s);
      setRewards(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(status);
  }, [status, load]);

  async function handleUse(id: string) {
    try {
      await rewardsService.markUsed(id);
      await load(status);
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
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setStatus(t.key)}
            style={[styles.tab, status === t.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, status === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
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
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  back: { fontSize: 24, color: '#262626' },
  title: { fontSize: 18, fontWeight: '700', color: '#262626' },
  tabs: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DBDBDB',
  },
  tabActive: { backgroundColor: '#262626', borderColor: '#262626' },
  tabText: { color: '#262626', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { padding: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E8E' },
});
