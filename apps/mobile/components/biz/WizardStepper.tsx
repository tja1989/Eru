import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';

interface WizardStepperProps {
  steps: string[];
  current: number; // 0-indexed
}

// Pill-row that shows numbered steps with the active one filled. The look
// matches the IG-style chrome: rounded, neutral palette, navy active.
export function WizardStepper({ steps, current }: WizardStepperProps) {
  return (
    <View style={styles.row} accessibilityRole="header">
      {steps.map((label, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <View key={label} style={styles.step}>
            <View style={[styles.dot, active && styles.dotActive, done && styles.dotDone]}>
              <Text style={[styles.dotText, (active || done) && styles.dotTextActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  step: { flex: 1, alignItems: 'center', gap: spacing.xs },
  dot: { width: 28, height: 28, borderRadius: radius.lg, backgroundColor: colors.g100, alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: colors.navy },
  dotDone: { backgroundColor: colors.green },
  dotText: { fontSize: 12, fontWeight: '700', color: colors.g500 },
  dotTextActive: { color: '#fff' },
  label: { fontSize: 11, color: colors.g500, fontWeight: '600' },
  labelActive: { color: colors.g800 },
});
