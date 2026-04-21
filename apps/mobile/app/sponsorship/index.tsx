import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { sponsorshipService, CreatorDashboard } from '@/services/sponsorshipService';
import { SponsorshipCard } from '@/components/SponsorshipCard';
import { colors, spacing } from '@/constants/theme';

export default function SponsorshipDashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<CreatorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const d = await sponsorshipService.getDashboard();
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onAccept = async (id: string) => {
    try {
      await sponsorshipService.accept(id);
      Alert.alert('Accepted', 'The boost is live. Your post is reaching a wider audience.');
      await load();
    } catch (e: any) {
      Alert.alert('Could not accept', e?.response?.data?.error ?? 'Try again');
    }
  };

  const onDecline = async (id: string) => {
    Alert.alert(
      'Decline boost?',
      'The business will be notified. You can always accept future proposals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              await sponsorshipService.decline(id);
              await load();
            } catch (e: any) {
              Alert.alert('Could not decline', e?.response?.data?.error ?? 'Try again');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Creator × Business</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading || !data ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : (
        <ScrollView>
          <View style={styles.statsRow}>
            <Stat label="Active" value={String(data.activeCount)} />
            <Stat label="Pending" value={String(data.pendingCount)} />
            <Stat label="Completed" value={String(data.completedCount)} />
          </View>
          <Text style={styles.earnings}>
            Total earnings: ₹{Number(data.totalEarnings).toLocaleString('en-IN')}
          </Text>

          {data.pending.length > 0 ? (
            <>
              <Text style={styles.section}>Pending ({data.pending.length})</Text>
              {data.pending.map((p) => (
                <SponsorshipCard key={p.id} proposal={p} onAccept={onAccept} onDecline={onDecline} />
              ))}
            </>
          ) : null}

          {data.active.length > 0 ? (
            <>
              <Text style={styles.section}>Active ({data.active.length})</Text>
              {data.active.map((p) => <SponsorshipCard key={p.id} proposal={p} />)}
            </>
          ) : null}

          {data.pending.length === 0 && data.active.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={styles.emptyTitle}>No proposals yet</Text>
              <Text style={styles.emptyBody}>
                When a business wants to boost your content, you'll see the proposal here and earn 20%
                commission when you accept.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
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
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.g100,
  },
  back: { fontSize: 22, color: colors.g800 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.g900 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: spacing.md },
  stat: { flex: 1, padding: 12, backgroundColor: colors.g50, borderRadius: 10, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.orange },
  statLabel: { fontSize: 12, color: colors.g500 },
  earnings: { padding: 16, fontSize: 16, fontWeight: '700', color: colors.g800 },
  section: { paddingHorizontal: 16, marginTop: 16, fontSize: 16, fontWeight: '700', color: colors.g800 },
  empty: { padding: 40, alignItems: 'center', gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.g800 },
  emptyBody: { fontSize: 13, color: colors.g500, textAlign: 'center', lineHeight: 18 },
});
