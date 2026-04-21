import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/theme';

interface Props {
  brand: string;
  fromPoints: number;
  color: string;
  emoji: string;
  onPress: () => void;
}

export function GiftCardTile({ brand, fromPoints, color, emoji, onPress }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${brand} gift card, from ${fromPoints} points`}
      onPress={onPress}
      style={styles.tile}
    >
      <View style={[styles.iconBox, { backgroundColor: color }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.brand}>{brand}</Text>
      <Text style={styles.from}>From {fromPoints.toLocaleString()} pts</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { width: '31%', alignItems: 'center', paddingVertical: 10 },
  iconBox: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emoji: { fontSize: 24 },
  brand: { fontSize: 12, fontWeight: '700', color: colors.g800 },
  from: { fontSize: 10, color: colors.g500, marginTop: 1 },
});
