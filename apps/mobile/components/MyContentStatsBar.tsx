import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { userService } from '@/services/userService';
import { colors } from '@/constants/theme';

type Summary = { published: number; pending: number; declined: number; totalLikes: number };

export function MyContentStatsBar() {
  const [s, setS] = useState<Summary>({ published: 0, pending: 0, declined: 0, totalLikes: 0 });

  useEffect(() => {
    userService.getMyContentSummary().then(setS).catch(() => {});
  }, []);

  return (
    <View style={styles.row}>
      <Stat label="Published" value={s.published} color={colors.green} />
      <Stat label="In Review" value={s.pending} color={colors.gold} />
      <Stat label="Declined" value={s.declined} color={colors.red} />
      <Stat label="Total Likes" value={s.totalLikes} color={colors.g700} />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color }]}>{value.toLocaleString()}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, padding: 12 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 11, color: '#737373', marginTop: 2 },
});
