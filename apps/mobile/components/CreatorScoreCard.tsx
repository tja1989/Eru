import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing, radius } from '../constants/theme';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreatorScoreCardProps {
  /** Current creator score, 0–100. */
  score: number;
  /** Delta since the start of the week. Positive = up, negative = down.
   *  Omit (or pass 0) to hide the chip entirely. */
  deltaThisWeek?: number;
  /** Compact variant: show score + /100 only — no ring, no delta chip. */
  compact?: boolean;
}

// ─── Ring constants ───────────────────────────────────────────────────────────

const RING_SIZE = 96;       // SVG viewport width/height in px
const STROKE_WIDTH = 7;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;   // inner radius of the ring
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// ─── Component ────────────────────────────────────────────────────────────────

export function CreatorScoreCard({
  score,
  deltaThisWeek,
  compact = false,
}: CreatorScoreCardProps) {
  const rounded = Math.round(score);
  const progress = Math.min(Math.max(rounded, 0), 100) / 100;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  // ── Compact variant ─────────────────────────────────────────────────────────
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactScore}>{rounded}</Text>
        <Text style={styles.compactSuffix}>/100</Text>
      </View>
    );
  }

  // ── Full variant ────────────────────────────────────────────────────────────
  const showDelta = deltaThisWeek !== undefined && deltaThisWeek !== 0;
  const deltaPositive = (deltaThisWeek ?? 0) > 0;

  return (
    <View style={styles.container}>
      {/* Circular SVG ring + score number overlaid in the centre */}
      <View style={styles.ringWrapper}>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          testID="creator-score-ring"
        >
          {/* Track (background circle) */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.g200}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Progress arc — rotated so it starts at the top (−90°) */}
          <Circle
            testID="score-ring-circle"
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            stroke={colors.navy}
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>

        {/* Score text centred inside the ring */}
        <View style={styles.scoreOverlay} pointerEvents="none">
          <Text style={styles.scoreNumber}>{rounded}</Text>
          <Text style={styles.scoreSuffix}>/100</Text>
        </View>
      </View>

      {/* Delta chip — only shown when a non-zero delta is provided */}
      {showDelta && (
        <View
          style={[
            styles.deltaChip,
            deltaPositive ? styles.deltaChipGreen : styles.deltaChipRed,
          ]}
        >
          <Text
            style={[
              styles.deltaText,
              deltaPositive ? styles.deltaTextGreen : styles.deltaTextRed,
            ]}
          >
            {deltaPositive
              ? `\u2B06 +${deltaThisWeek} this week`
              : `\u2B07 \u2212${Math.abs(deltaThisWeek!)} this week`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full variant
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  ringWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  scoreNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.g900,
    lineHeight: 30,
  },
  scoreSuffix: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.g500,
    lineHeight: 30,
    marginLeft: 1,
  },

  deltaChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  deltaChipGreen: { backgroundColor: 'rgba(34,197,94,0.12)' },
  deltaChipRed: { backgroundColor: 'rgba(239,68,68,0.12)' },
  deltaText: { fontSize: 12, fontWeight: '700' },
  deltaTextGreen: { color: '#22C55E' },
  deltaTextRed: { color: '#EF4444' },

  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  compactScore: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.g900,
  },
  compactSuffix: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.g500,
    marginLeft: 1,
  },
});
