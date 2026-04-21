import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  count: number;
  activeIndex: number;
}

export function CarouselDots({ count, activeIndex }: Props) {
  if (count <= 1) return null;
  return (
    <View style={styles.wrap} accessibilityLabel="carousel indicator">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          accessibilityLabel={`carousel dot ${i + 1}`}
          accessibilityState={{ selected: i === activeIndex }}
          style={[styles.dot, i === activeIndex && styles.dotActive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'center', gap: 4, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.g200 },
  dotActive: { backgroundColor: colors.blue },
});
