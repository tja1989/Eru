import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

type Props = {
  current: number;       // 1-indexed (1, 2, 3, 4)
  total: number;
  caption?: string;      // e.g. "Step 1 of 4 • 193 pts/day average"
};

/**
 * 4-segment progress bar used by the onboarding flow.
 * Segments before `current` render green; the active segment is orange;
 * remaining segments stay neutral grey.
 */
export function ProgressSteps({ current, total, caption }: Props) {
  return (
    <View style={styles.wrap} accessibilityLabel={`Step ${current} of ${total}`}>
      <View style={styles.row}>
        {Array.from({ length: total }).map((_, i) => {
          const idx = i + 1;
          const segStyle =
            idx < current ? styles.done : idx === current ? styles.active : styles.pending;
          return <View key={i} testID={`progress-seg-${idx}`} style={[styles.seg, segStyle]} />;
        })}
      </View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10 },
  row: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  done: { backgroundColor: colors.green },
  active: { backgroundColor: colors.orange },
  pending: { backgroundColor: colors.g200 },
  caption: { fontSize: 10, color: colors.g400, marginTop: 4 },
});
