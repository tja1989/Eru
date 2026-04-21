import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

export type CommentSort = 'top' | 'recent';

interface Props {
  value: CommentSort;
  onChange: (next: CommentSort) => void;
}

const LABELS: Record<CommentSort, string> = {
  top: 'Most liked',
  recent: 'Most recent',
};

export function CommentSortDropdown({ value, onChange }: Props) {
  const label = LABELS[value];
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Change comment sort, currently ${label}`}
      onPress={() => onChange(value === 'top' ? 'recent' : 'top')}
      style={styles.pill}
    >
      <Text style={styles.text}>{label} ▾</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.g100,
  },
  text: { fontSize: 11, fontWeight: '600', color: colors.g700 },
});
