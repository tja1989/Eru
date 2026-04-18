import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Badge } from '@/services/badgesService';

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <View style={styles.grid}>
      {badges.map((b) => {
        const unlocked = !!b.unlockedAt;
        return (
          <View
            key={b.id}
            testID={`badge-${b.code}`}
            style={[styles.cell, !unlocked && { opacity: 0.25 }]}
          >
            <Text style={styles.emoji}>{b.emoji}</Text>
            <Text style={styles.title}>{b.title}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  cell: { width: '25%', alignItems: 'center', paddingVertical: 16 },
  emoji: { fontSize: 32 },
  title: { fontSize: 11, fontWeight: '600', color: '#262626', marginTop: 4, textAlign: 'center' },
});
