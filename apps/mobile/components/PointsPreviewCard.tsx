import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

// Shown above the Share button on Create to set the earnings expectation
// before the user submits. Three columns match the PWA's breakdown.
export function PointsPreviewCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🪙 Points You'll Earn</Text>
      <View style={styles.row}>
        <Column label="Post approved" value="+30" />
        <View style={styles.divider} />
        <Column label="Each like received" value="+1" />
        <View style={styles.divider} />
        <Column label="If it trends" value="+200" highlighted />
      </View>
    </View>
  );
}

function Column({ label, value, highlighted }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <View style={styles.col}>
      <Text style={[styles.value, highlighted && styles.valueHighlighted]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.22)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  title: { fontSize: 12, fontWeight: '700', color: colors.green, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  col: { alignItems: 'center', flex: 1 },
  value: { fontSize: 18, fontWeight: '800', color: colors.green },
  valueHighlighted: { color: colors.orange },
  label: { fontSize: 10, color: colors.g600, marginTop: 2, textAlign: 'center' },
  divider: { width: 0.5, height: 32, backgroundColor: colors.g200 },
});
