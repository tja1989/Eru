import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';
import { usePointsStore } from '../stores/pointsStore';

export function PointsBadge() {
  const router = useRouter();
  const { balance, streak } = usePointsStore();
  return (
    <TouchableOpacity style={styles.badge} onPress={() => router.push('/wallet' as any)}>
      <Text style={styles.coin}>🪙</Text>
      <Text style={styles.points}>{balance.toLocaleString()}</Text>
      {streak > 0 && <Text style={styles.streak}>🔥{streak}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.2)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 3 },
  coin: { fontSize: 11 },
  points: { fontSize: 12, fontWeight: '700', color: colors.green },
  streak: { fontSize: 10, fontWeight: '700', color: colors.orange },
});
