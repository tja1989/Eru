import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  points: number;
}

export function PostPointsBadge({ points }: Props) {
  if (points <= 0) return null;
  return (
    <View style={styles.badge} accessibilityLabel={`Earn ${points} points by viewing`}>
      <Text style={styles.text}>🪙 +{points}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: { fontSize: 11, fontWeight: '700', color: colors.green },
});
