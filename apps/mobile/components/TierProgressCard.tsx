import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type TierMeta = {
  label: string;
  emoji: string;
  multiplier: string;
  threshold: number;
};

// Thresholds mirror `@eru/shared`'s TIER_CONFIGS — the `threshold` here is
// "lifetimePoints needed to *reach* this tier" (so engager=2000, influencer=
// 10000, etc.). Duplicated locally so the component is a pure view.
const TIER_META: Record<string, TierMeta> = {
  explorer: { label: 'Explorer', emoji: '\u{1F331}', multiplier: '1.0x', threshold: 0 },
  engager: { label: 'Engager', emoji: '\u{26A1}', multiplier: '1.2x', threshold: 2000 },
  influencer: { label: 'Influencer', emoji: '\u{1F525}', multiplier: '1.5x', threshold: 10000 },
  champion: { label: 'Champion', emoji: '\u{1F451}', multiplier: '2.0x', threshold: 50000 },
};

type Props = {
  currentTier: string;
  nextTier: string | null;
  pointsToNext: number;
  lifetimePoints: number;
};

export function TierProgressCard({
  currentTier,
  nextTier,
  pointsToNext,
  lifetimePoints,
}: Props) {
  const current = TIER_META[currentTier] ?? TIER_META.explorer;
  const threshold = nextTier ? TIER_META[nextTier]?.threshold ?? current.threshold : 0;
  const progressPct =
    nextTier && threshold > 0
      ? Math.min(100, Math.round((lifetimePoints / threshold) * 100))
      : 100;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <View>
            <Text style={styles.tierLabel}>{current.label} Tier</Text>
            <Text style={styles.multi}>{current.multiplier} multiplier</Text>
          </View>
        </View>
        {nextTier ? (
          <View style={styles.nextChip}>
            <Text style={styles.nextText}>
              Next: {TIER_META[nextTier]?.emoji ?? ''} {TIER_META[nextTier]?.label ?? nextTier}
            </Text>
          </View>
        ) : null}
      </View>

      {nextTier && (
        <>
          <View style={styles.barWrap}>
            {/* Inline-merged style (not an array) so Jest's
                expect.objectContaining({ width }) can match props.style. */}
            <View
              testID="progress-fill"
              style={{ ...styles.barFill, width: `${progressPct}%` }}
            />
          </View>
          <Text style={styles.progressText}>
            {lifetimePoints.toLocaleString()} / {threshold.toLocaleString()}
          </Text>
          <Text style={styles.hint}>
            {pointsToNext.toLocaleString()} pts away from {TIER_META[nextTier]?.label ?? nextTier}{' '}
            ({TIER_META[nextTier]?.multiplier ?? ''}) {'\u{1F680}'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  nextChip: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#FAFAFA', borderRadius: 999 },
  nextText: { fontSize: 11, fontWeight: '600', color: '#737373' },
  emoji: { fontSize: 32, marginRight: 12 },
  tierLabel: { fontWeight: '700', fontSize: 16, color: '#262626' },
  multi: { color: '#737373', fontSize: 13 },
  barWrap: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#1A3C6E', borderRadius: 4 },
  progressText: { marginTop: 6, fontSize: 12, color: '#737373' },
  hint: { marginTop: 4, fontSize: 12, color: '#10B981' },
});
