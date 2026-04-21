import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { businessService } from '@/services/businessService';
import { watchlistService } from '@/services/watchlistService';
import { colors, spacing, radius } from '@/constants/theme';

export default function Storefront() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [biz, setBiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    businessService.get(id).then((b) => {
      setBiz(b);
      setLoading(false);
    });
    // Check current watchlist state so the Follow button reflects reality.
    watchlistService.list().then((res: any) => {
      const rows = Array.isArray(res) ? res : (res?.items ?? []);
      const found = rows.some((r: any) => r.businessId === id);
      setFollowing(found);
    }).catch(() => {});
  }, [id]);

  async function handleFollowToggle() {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      if (following) {
        await watchlistService.remove(id);
        setFollowing(false);
      } else {
        await watchlistService.add(id);
        setFollowing(true);
        Alert.alert('Following!', 'You\'ll be notified when this business drops new offers.');
      }
    } catch (e: any) {
      Alert.alert('Couldn\'t update', e?.response?.data?.error ?? 'Try again');
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading || !biz) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{biz.name}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.hero} />
        <View style={styles.body}>
          <Text style={styles.name}>
            <Text>{biz.name}</Text>
            {biz.isVerified ? <Text style={styles.verified}> ✓</Text> : null}
          </Text>
          <Text style={styles.cat}>{biz.category} · 📍 {biz.pincode}</Text>
          <View style={styles.stats}>
            <Text style={styles.statItem}>⭐ {biz.rating}</Text>
            <Text style={styles.statItem}>{biz.reviewCount} reviews</Text>
          </View>

          <TouchableOpacity
            accessibilityLabel={following ? 'Unfollow business' : 'Follow business'}
            style={[styles.followBtn, following && styles.followBtnActive]}
            onPress={handleFollowToggle}
            disabled={followBusy}
          >
            <Text style={[styles.followText, following && styles.followTextActive]}>
              {following ? '✓ Following' : '⭐ Follow & Get Offers'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>Offers ({biz.offers?.length ?? 0})</Text>
          {(biz.offers ?? []).map((o: any) => (
            <View key={o.id} style={styles.offerRow}>
              <Text style={{ flex: 1, color: colors.g800 }}>{o.title}</Text>
              <Text style={styles.pts}>🪙 {o.pointsCost}</Text>
            </View>
          ))}

          {biz.phone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${biz.phone}`)} style={styles.callBtn}>
              <Text>📞 Call</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  back: { fontSize: 22, color: colors.g800 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.g900, flex: 1, textAlign: 'center' },
  hero: { height: 180, backgroundColor: '#FFA726' },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: colors.g900 },
  verified: { color: colors.blue },
  cat: { color: colors.g500, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 10 },
  statItem: { color: colors.g700 },
  followBtn: { marginTop: 16, backgroundColor: colors.orange, padding: 12, borderRadius: radius.md, alignItems: 'center' },
  followBtnActive: { backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: colors.green },
  followText: { color: '#fff', fontWeight: '700' },
  followTextActive: { color: colors.green },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: colors.g800, marginTop: 22, marginBottom: 8 },
  offerRow: { flexDirection: 'row', padding: 12, backgroundColor: '#FAFAFA', borderRadius: radius.md, marginBottom: 6 },
  pts: { color: colors.green, fontWeight: '700' },
  callBtn: { marginTop: 16, padding: 12, backgroundColor: '#FAFAFA', borderRadius: radius.md, alignItems: 'center' },
});
