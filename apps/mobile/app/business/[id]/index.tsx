import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { businessService } from '@/services/businessService';

export default function Storefront() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [biz, setBiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    businessService.get(id).then((b) => {
      setBiz(b);
      setLoading(false);
    });
  }, [id]);

  if (loading || !biz) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <ScrollView style={styles.root}>
      <View style={styles.hero} />
      <View style={styles.body}>
        <Text style={styles.name}>
          <Text>{biz.name}</Text>
          {biz.isVerified ? <Text> ✓</Text> : null}
        </Text>
        <Text style={styles.cat}>{biz.category} · 📍 {biz.pincode}</Text>
        <View style={styles.stats}>
          <Text>⭐ {biz.rating}</Text>
          <Text>{biz.reviewCount} reviews</Text>
        </View>

        <TouchableOpacity style={styles.followBtn}>
          <Text style={styles.followText}>⭐ Follow & Get Offers</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Offers ({biz.offers.length})</Text>
        {biz.offers.map((o: any) => (
          <View key={o.id} style={styles.offerRow}>
            <Text style={{ flex: 1 }}>{o.title}</Text>
            <Text style={styles.pts}>🪙 {o.pointsCost}</Text>
          </View>
        ))}

        {biz.phone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${biz.phone}`)} style={styles.callBtn}>
            <Text>📞 Call</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  hero: { height: 180, backgroundColor: '#FFA726' },
  body: { padding: 16 },
  name: { fontSize: 22, fontWeight: '800', color: '#262626' },
  cat: { color: '#737373', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 16, marginTop: 10 },
  followBtn: { marginTop: 16, backgroundColor: '#E8792B', padding: 12, borderRadius: 10, alignItems: 'center' },
  followText: { color: '#fff', fontWeight: '700' },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginTop: 22, marginBottom: 8 },
  offerRow: { flexDirection: 'row', padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, marginBottom: 6 },
  pts: { color: '#10B981', fontWeight: '700' },
  callBtn: { marginTop: 16, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, alignItems: 'center' },
});
