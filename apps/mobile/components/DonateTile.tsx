import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  emoji: string;
  title: string;
  costCopy: string;
  matchCopy: string;
  onPress: () => void;
}

export function DonateTile({ emoji, title, costCopy, matchCopy, onPress }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.tile}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.cost}>{costCopy}</Text>
      <Text style={styles.match}>{matchCopy}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    gap: 2,
  },
  emoji: { fontSize: 28, marginBottom: 2 },
  title: { fontSize: 12, fontWeight: '700', color: colors.g800 },
  cost: { fontSize: 10, color: colors.g500, textAlign: 'center' },
  match: { fontSize: 10, fontWeight: '600', color: colors.green, textAlign: 'center' },
});
