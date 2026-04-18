import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sponsorshipService, CreatorDashboard } from '@/services/sponsorshipService';
import { SponsorshipCard } from '@/components/SponsorshipCard';

export default function SponsorshipDashboardScreen() {
  const [data, setData] = useState<CreatorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await sponsorshipService.getDashboard();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) return <ActivityIndicator style={{ flex: 1 }} />;

  const onAccept = async (id: string) => { await sponsorshipService.accept(id); load(); };
  const onDecline = async (id: string) => { await sponsorshipService.decline(id); load(); };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView>
        <Text style={styles.h1}>Creator × Business</Text>
        <View style={styles.statsRow}>
          <Stat label="Active" value={String(data.activeCount)} />
          <Stat label="Pending" value={String(data.pendingCount)} />
          <Stat label="Completed" value={String(data.completedCount)} />
        </View>
        <Text style={styles.earnings}>Total earnings: ₹{Number(data.totalEarnings).toLocaleString('en-IN')}</Text>

        {data.pending.length > 0 && (
          <>
            <Text style={styles.section}>Pending ({data.pending.length})</Text>
            {data.pending.map((p) => (
              <SponsorshipCard key={p.id} proposal={p} onAccept={onAccept} onDecline={onDecline} />
            ))}
          </>
        )}

        {data.active.length > 0 && (
          <>
            <Text style={styles.section}>Active ({data.active.length})</Text>
            {data.active.map((p) => <SponsorshipCard key={p.id} proposal={p} />)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  h1: { fontSize: 22, fontWeight: '800', padding: 16 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  stat: { flex: 1, padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#E8792B' },
  statLabel: { fontSize: 12, color: '#737373' },
  earnings: { padding: 16, fontSize: 16, fontWeight: '700' },
  section: { paddingHorizontal: 16, marginTop: 16, fontSize: 16, fontWeight: '700' },
});
