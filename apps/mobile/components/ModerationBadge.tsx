import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

type Variant = 'approved' | 'pending' | 'declined' | null;

interface Props {
  variant: Variant;
}

const COPY: Record<Exclude<Variant, null>, { text: string; bg: string; fg: string }> = {
  approved: { text: '✓ APPROVED', bg: 'rgba(16,185,129,0.12)', fg: colors.green },
  pending: { text: '⏳ PENDING', bg: 'rgba(217,119,6,0.12)', fg: colors.gold },
  declined: { text: '✕ DECLINED', bg: 'rgba(237,73,86,0.12)', fg: colors.red },
};

export function ModerationBadge({ variant }: Props) {
  if (!variant) return null;
  const { text, bg, fg } = COPY[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});
