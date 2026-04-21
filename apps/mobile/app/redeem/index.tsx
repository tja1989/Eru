import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { offersService, Offer } from '@/services/offersService';
import { OfferCard } from '@/components/OfferCard';
import { GiftCardTile } from '@/components/GiftCardTile';
import { DonateTile } from '@/components/DonateTile';
import { RechargeCard, type RechargePlan } from '@/components/RechargeCard';
import { usePointsStore } from '@/stores/pointsStore';
import { colors, spacing, radius } from '@/constants/theme';

type Category = 'all' | 'local' | 'giftcard' | 'recharge' | 'donate' | 'premium';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: '🔥 All' },
  { key: 'local', label: '🏪 Local' },
  { key: 'giftcard', label: '🎁 Gift Cards' },
  { key: 'recharge', label: '📱 Recharge' },
  { key: 'donate', label: '💝 Donate' },
  { key: 'premium', label: '⭐ Premium' },
];

// Hardcoded gift-card brands (PWA parity). Real inventory comes from
// partner APIs (Amazon SPN, Qwikcilver, etc.) — this is the stub.
const GIFT_CARDS = [
  { brand: 'Amazon', fromPoints: 1000, color: '#FF9900', emoji: '\u{1F6D2}' },
  { brand: 'Flipkart', fromPoints: 1000, color: '#2874F0', emoji: '\u{1F6CD}' },
  { brand: 'Swiggy', fromPoints: 500, color: '#FC8019', emoji: '\u{1F354}' },
  { brand: 'BookMyShow', fromPoints: 800, color: '#C4242D', emoji: '\u{1F39F}' },
  { brand: 'BigBasket', fromPoints: 1000, color: '#84C225', emoji: '\u{1F345}' },
  { brand: 'Myntra', fromPoints: 1000, color: '#FF3E6C', emoji: '\u{1F45F}' },
];

const DONATE_OPTIONS = [
  { emoji: '\u{1F333}', title: 'Plant a Tree', costCopy: '500 pts = 1 tree', matchCopy: 'Eru adds +100 pts match' },
  { emoji: '\u{1F4DA}', title: 'Books for Kids', costCopy: '1,000 pts = 3 books', matchCopy: 'Eru adds +200 pts match' },
  { emoji: '\u{1F91D}', title: 'Local Cause', costCopy: '200 pts minimum', matchCopy: 'Eru adds +40 pts match' },
];

const RECHARGE_PLANS: RechargePlan[] = [
  { id: 'jio_149', amountRupees: 149, pointsCost: 1490 },
  { id: 'jio_239', amountRupees: 239, pointsCost: 2390 },
  { id: 'jio_479', amountRupees: 479, pointsCost: 4790 },
];

export default function RedeemScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ type?: string }>();
  const initialCat = useMemo<Category>(() => {
    const t = searchParams?.type as Category | undefined;
    return t && CATEGORIES.some((c) => c.key === t) ? t : 'all';
  }, [searchParams?.type]);

  const [category, setCategory] = useState<Category>(initialCat);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState<Record<string, string>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { balance } = usePointsStore();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    offersService.list(category === 'all' ? 'all' : (category as Offer['type'])).then((data) => {
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

  const showHotDeals = category === 'all' || category === 'local';
  const showGiftCards = category === 'all' || category === 'giftcard';
  const showRecharge = category === 'all' || category === 'recharge';
  const showDonate = category === 'all' || category === 'donate';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Rewards Store</Text>
        <View style={styles.balancePill}>
          <Text style={styles.balanceText}>🪙 {balance.toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {CATEGORIES.map((c) => {
          const selected = category === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              testID={`tab-${c.key}`}
              accessibilityState={{ selected }}
              onPress={() => setCategory(c.key)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {/* Hot Deals horizontal carousel (only when All or Local) */}
        {showHotDeals ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Hot Deals Near You</Text>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : offers.length === 0 ? (
              <Text style={styles.empty}>No local offers right now</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
                {offers.slice(0, 10).map((offer) => (
                  <View key={offer.id} style={{ width: 240 }}>
                    <OfferCard offer={offer} onClaim={handleClaim} claimed={!!claimed[offer.id]} />
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* Gift Cards grid */}
        {showGiftCards ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎁 Gift Cards</Text>
            <View style={styles.giftGrid}>
              {GIFT_CARDS.map((gc) => (
                <GiftCardTile
                  key={gc.brand}
                  brand={gc.brand}
                  fromPoints={gc.fromPoints}
                  color={gc.color}
                  emoji={gc.emoji}
                  onPress={() => Alert.alert('Coming soon', `${gc.brand} gift-card fulfilment ships with partner integration.`)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Mobile Recharge card */}
        {showRecharge ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📱 Mobile Recharge</Text>
            <RechargeCard
              phone="+91 98765 43210"
              operator="Jio"
              lastRechargeRupees={239}
              plans={RECHARGE_PLANS}
              selectedPlanId={selectedPlanId}
              onSelectPlan={setSelectedPlanId}
              onSubmit={() => Alert.alert('Submitted', `Recharge queued for plan ${selectedPlanId}`)}
            />
          </View>
        ) : null}

        {/* Donate tiles */}
        {showDonate ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💝 Donate (Eru Matches +20%)</Text>
            <View style={styles.donateRow}>
              {DONATE_OPTIONS.map((d) => (
                <DonateTile
                  key={d.title}
                  emoji={d.emoji}
                  title={d.title}
                  costCopy={d.costCopy}
                  matchCopy={d.matchCopy}
                  onPress={() => Alert.alert('Thanks!', `${d.title} donation flow coming soon.`)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: colors.card, borderBottomWidth: 0.5, borderBottomColor: colors.g100,
  },
  back: { fontSize: 22, color: colors.g800 },
  title: { fontSize: 16, fontWeight: '700', color: colors.g900 },
  balancePill: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full,
  },
  balanceText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  tabs: { paddingVertical: spacing.sm, flexGrow: 0 },
  tab: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.g300 },
  tabActive: { backgroundColor: colors.g800, borderColor: colors.g800 },
  tabText: { color: colors.g500, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  list: { paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 20, color: colors.g500 },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.g800, marginBottom: spacing.sm },
  giftGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  donateRow: { flexDirection: 'row', gap: spacing.sm },
});
