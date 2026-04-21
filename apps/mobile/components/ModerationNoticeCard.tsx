import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

// Sits right above the PointsPreviewCard on Create so the user knows the
// post won't be visible instantly — a promise we keep by approving within
// 15 minutes in the common case.
export function ModerationNoticeCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>🛡️ Content Review</Text>
      <Text style={styles.body}>
        Your post will be reviewed by Eru's moderation team before it appears in the public feed.
        Most posts are approved within 15 minutes. You'll earn <Text style={styles.bold}>+30 pts</Text> once approved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    backgroundColor: 'rgba(217,119,6,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.22)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  title: { fontSize: 12, fontWeight: '700', color: colors.gold, marginBottom: 4 },
  body: { fontSize: 11, color: colors.g700, lineHeight: 17 },
  bold: { fontWeight: '700', color: colors.gold },
});
