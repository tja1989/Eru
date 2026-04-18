import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type PodiumEntry = {
  rank: number;
  username: string;
  avatarUrl?: string | null;
  weeklyPoints: number;
};

export function LeaderboardPodium({ top3 }: { top3: PodiumEntry[] }) {
  if (!top3 || top3.length === 0) return null;

  const byRank = new Map(top3.map((u) => [u.rank, u]));
  const rank1 = byRank.get(1);
  const rank2 = byRank.get(2);
  const rank3 = byRank.get(3);

  return (
    <View style={styles.root}>
      <View style={[styles.column, styles.colSide]}>
        {rank2 && <PodiumBar entry={rank2} medal="🥈" height={90} testID="podium-rank-2" />}
      </View>
      <View style={[styles.column, styles.colCenter]}>
        {rank1 && <PodiumBar entry={rank1} medal="🥇" height={120} testID="podium-rank-1" />}
      </View>
      <View style={[styles.column, styles.colSide]}>
        {rank3 && <PodiumBar entry={rank3} medal="🥉" height={70} testID="podium-rank-3" />}
      </View>
    </View>
  );
}

function PodiumBar({
  entry,
  medal,
  height,
  testID,
}: {
  entry: PodiumEntry;
  medal: string;
  height: number;
  testID: string;
}) {
  return (
    <View style={styles.barWrap} testID={testID}>
      <Text style={styles.medal}>{medal}</Text>
      <Text style={styles.username} numberOfLines={1}>
        @{entry.username}
      </Text>
      <View style={[styles.bar, { height }]} testID={`${testID}-bar`}>
        <Text style={styles.points}>{entry.weeklyPoints.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 16,
    gap: 8,
  },
  column: { alignItems: 'center' },
  colSide: { width: 96 },
  colCenter: { width: 112 },
  barWrap: { alignItems: 'center' },
  medal: { fontSize: 26, marginBottom: 2 },
  username: { fontSize: 12, fontWeight: '700', color: '#262626', maxWidth: 90 },
  bar: {
    backgroundColor: '#E8792B',
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    marginTop: 4,
  },
  points: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
