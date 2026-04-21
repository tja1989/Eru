import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

type Variant = 'creator' | 'user_created' | null;

interface Props {
  variant: Variant;
}

const COPY: Record<Exclude<Variant, null>, { text: string; a11y: string }> = {
  creator: { text: '✓ CREATOR', a11y: 'Verified creator content' },
  user_created: { text: '✓ USER CREATED', a11y: 'User-created content' },
};

export function UgcBadge({ variant }: Props) {
  if (!variant) return null;
  const { text, a11y } = COPY[variant];
  return (
    <View style={styles.badge} accessibilityLabel={a11y}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(13,148,136,0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.teal,
    letterSpacing: 0.5,
  },
});
