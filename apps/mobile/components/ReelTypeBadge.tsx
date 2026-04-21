import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  durationSeconds: number | null;
}

function formatDuration(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ReelTypeBadge({ durationSeconds }: Props) {
  const label = durationSeconds != null ? `▶ Reel • ${formatDuration(durationSeconds)}` : '▶ Reel';
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
