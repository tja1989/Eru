import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { WatchlistDealItem } from '@eru/shared';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  deal: WatchlistDealItem;
  onClaim: (offerId: string) => void;
}

export function WatchlistDealCard({ deal, onClaim }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.biz} numberOfLines={1}>{deal.businessName}</Text>
        <View style={styles.followedBadge}>
          <Text style={styles.followedText}>✓ Followed</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{deal.title}</Text>
      {deal.description ? (
        <Text style={styles.desc} numberOfLines={2}>{deal.description}</Text>
      ) : null}
      <View style={styles.footer}>
        <Text style={styles.pts}>🪙 {deal.pointsCost.toLocaleString()} pts</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Claim ${deal.title}`}
          onPress={() => onClaim(deal.id)}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Claim</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.orange,
    borderWidth: 0.5,
    borderColor: colors.g200,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  biz: { fontSize: 12, fontWeight: '700', color: colors.g800, flex: 1 },
  followedBadge: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  followedText: { fontSize: 9, fontWeight: '700', color: colors.green },
  title: { fontSize: 14, fontWeight: '700', color: colors.g900 },
  desc: { fontSize: 12, color: colors.g500, marginTop: 4, lineHeight: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  pts: { fontSize: 12, fontWeight: '700', color: colors.green },
  cta: { backgroundColor: colors.orange, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.full },
  ctaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
