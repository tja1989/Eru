import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tierColors } from '../constants/theme';

const TIER_LABELS: Record<string, { emoji: string; label: string }> = {
  explorer: { emoji: '🌱', label: 'Explorer' },
  engager: { emoji: '⚡', label: 'Engager' },
  influencer: { emoji: '🔥', label: 'Influencer' },
  champion: { emoji: '👑', label: 'Champion' },
};

export function TierBadge({ tier }: { tier: string }) {
  const config = TIER_LABELS[tier];
  if (!config) return null;
  return (
    <View style={[styles.badge, { backgroundColor: `${tierColors[tier]}20` }]}>
      <Text style={styles.text}>{config.emoji} {config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  text: { fontSize: 11, fontWeight: '700' },
});
