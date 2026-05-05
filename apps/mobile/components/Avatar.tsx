import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { tierColors, colors } from '../constants/theme';

interface AvatarProps {
  uri: string | null;
  size?: number;
  tier?: string;
}

export function Avatar({ uri, size = 40, tier }: AvatarProps) {
  const borderColor = tier ? tierColors[tier] || colors.g400 : 'transparent';
  return (
    <View style={[styles.ring, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, borderColor, borderWidth: tier ? 2 : 0 }]}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: size - 2, height: size - 2, borderRadius: (size - 2) / 2 }} />
        ) : (
          <View style={[styles.placeholder, { width: size - 2, height: size - 2, borderRadius: (size - 2) / 2 }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  container: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  placeholder: { backgroundColor: '#E0E0E0' },
});
