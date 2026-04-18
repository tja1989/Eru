import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { sponsorshipService, CreatorDashboard } from '@/services/sponsorshipService';

export function CreatorEarningsCard() {
  const [data, setData] = useState<CreatorDashboard | null>(null);
  useEffect(() => {
    sponsorshipService.getDashboard().then(setData).catch(() => setData(null));
  }, []);

  const earnings = Number(data?.totalEarnings ?? 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Creator Earnings</Text>
      <Text style={styles.subtitle}>Commission (20%)</Text>
      {earnings === 0 ? (
        <Text style={styles.empty}>No sponsored earnings yet</Text>
      ) : (
        <>
          <Text style={styles.amount}>₹{earnings.toLocaleString('en-IN')}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{data?.activeCount ?? 0} active</Text>
            <Text style={styles.meta}>{data?.completedCount ?? 0} completed</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, backgroundColor: '#FFF7E0', borderRadius: 12 },
  title: { fontSize: 14, fontWeight: '700', color: '#262626' },
  subtitle: { fontSize: 11, color: '#737373', marginTop: 2 },
  amount: { fontSize: 26, fontWeight: '800', color: '#E8792B', marginTop: 8 },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 6 },
  meta: { fontSize: 12, color: '#737373' },
  empty: { fontSize: 13, color: '#737373', marginTop: 8 },
});
