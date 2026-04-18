import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { offersService, Offer } from '@/services/offersService';
import { OfferCard } from '@/components/OfferCard';
import { usePointsStore } from '@/stores/pointsStore';

const CATEGORIES: { key: Offer['type'] | 'all'; label: string }[] = [
  { key: 'all', label: '🔥 All' },
  { key: 'local', label: '🏪 Local' },
  { key: 'giftcard', label: '🎁 Gift Cards' },
  { key: 'recharge', label: '📱 Recharge' },
  { key: 'donate', label: '💝 Donate' },
  { key: 'premium', label: '⭐ Premium' },
];

export default function RedeemScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Offer['type'] | 'all'>('all');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    offersService.list(category).then((data) => {
      if (!alive) return;
      setOffers(data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [category]);

  async function handleClaim(offerId: string) {
    try {
      const reward = await offersService.claim(offerId);
      setClaimed((prev) => ({ ...prev, [offerId]: reward.claimCode }));
      await usePointsStore.getState().refreshSummary();
      Alert.alert('Claimed!', `Your code: ${reward.claimCode}`);
    } catch (e: any) {
      Alert.alert('Could not claim', e?.response?.data?.error ?? 'Try again');
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Redeem</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            onPress={() => setCategory(c.key)}
            style={[styles.tab, category === c.key && styles.tabActive]}
          >
            <Text style={[styles.tabText, category === c.key && styles.tabTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : offers.length === 0 ? (
          <Text style={styles.empty}>No offers available</Text>
        ) : (
          offers.map((offer) => (
            <View key={offer.id}>
              <OfferCard offer={offer} onClaim={handleClaim} claimed={!!claimed[offer.id]} />
              {claimed[offer.id] && (
                <Text style={styles.code}>Code: {claimed[offer.id]}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
  },
  back: { fontSize: 24, color: '#262626' },
  title: { fontSize: 18, fontWeight: '700', color: '#262626' },
  tabs: { padding: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#DBDBDB' },
  tabActive: { backgroundColor: '#262626', borderColor: '#262626' },
  tabText: { color: '#262626', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { padding: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E8E' },
  code: { color: '#10B981', fontWeight: '700', marginTop: -6, marginBottom: 10 },
});
