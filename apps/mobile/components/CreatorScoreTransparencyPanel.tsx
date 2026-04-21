import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  score: number;
  likes: number;
  dislikes: number;
  reports: number;
  shares: number;
  trending: number;
}

// Threshold below which creators see a warning + reduced reach. Matches the
// Dev Spec's creator-score tiering.
const LOW_SCORE_THRESHOLD = 40;

const RULES: { label: string; delta: string; positive: boolean }[] = [
  { label: 'per like', delta: '+0.1', positive: true },
  { label: 'per share', delta: '+0.3', positive: true },
  { label: 'per trending post', delta: '+5', positive: true },
  { label: 'per dislike', delta: '-0.5', positive: false },
  { label: 'per report', delta: '-5', positive: false },
];

export function CreatorScoreTransparencyPanel({
  score,
  likes,
  dislikes,
  reports: _reports,
  shares: _shares,
  trending: _trending,
}: Props) {
  const total = likes + dislikes;
  const ratioPct = total === 0 ? 0 : Math.round((likes / total) * 100);
  const belowThreshold = score < LOW_SCORE_THRESHOLD;

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>How your score changes</Text>

      {/* Like-to-dislike ratio bar */}
      <View style={styles.ratioRow}>
        <Text style={styles.ratioLabel}>Like ratio</Text>
        <Text style={styles.ratioValue}>{ratioPct}%</Text>
      </View>
      <View style={styles.ratioTrack}>
        <View style={[styles.ratioFill, { width: `${ratioPct}%` }]} />
      </View>
      <Text style={styles.ratioHint}>
        {likes.toLocaleString()} likes · {dislikes.toLocaleString()} dislikes
      </Text>

      {/* Math rules */}
      <View style={styles.rulesBlock}>
        {RULES.map((r) => (
          <Text key={r.label} style={styles.ruleLine}>
            <Text style={[styles.ruleDelta, r.positive ? styles.rulePositive : styles.ruleNegative]}>
              {r.delta}
            </Text>
            <Text style={styles.ruleLabel}> {r.label}</Text>
          </Text>
        ))}
      </View>

      {/* Threshold warning */}
      {belowThreshold ? (
        <View style={styles.warn}>
          <Text style={styles.warnIcon}>⚠️</Text>
          <Text style={styles.warnText}>
            Your score is below the 40 threshold — reach is temporarily reduced. Lift it by
            earning more likes and avoiding reports.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.g200,
  },
  heading: { fontSize: 13, fontWeight: '700', color: colors.g800, marginBottom: spacing.sm },
  ratioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ratioLabel: { fontSize: 11, color: colors.g500, fontWeight: '600' },
  ratioValue: { fontSize: 16, fontWeight: '800', color: colors.green },
  ratioTrack: {
    height: 6,
    backgroundColor: colors.g100,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  ratioFill: { height: '100%', backgroundColor: colors.green, borderRadius: radius.full },
  ratioHint: { fontSize: 10, color: colors.g500, marginTop: 4 },
  rulesBlock: { marginTop: spacing.md, gap: 4 },
  ruleLine: { fontSize: 12, color: colors.g700, lineHeight: 18 },
  ruleDelta: { fontSize: 12, fontWeight: '800' },
  rulePositive: { color: colors.green },
  ruleNegative: { color: colors.red },
  ruleLabel: { fontSize: 12, color: colors.g700 },
  warn: {
    marginTop: spacing.md,
    padding: spacing.sm,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(237,73,86,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(237,73,86,0.28)',
    borderRadius: radius.md,
  },
  warnIcon: { fontSize: 16 },
  warnText: { flex: 1, fontSize: 11, color: colors.red, lineHeight: 16, fontWeight: '500' },
});
