// apps/mobile/components/Avatar.tsx
// IG-fidelity Avatar with optional Story ring (gradient) or tier ring.
//
// Three modes (in priority order):
//   1. hasStory={true}        → multi-stop pink/orange/purple gradient ring
//   2. hasStory={true} viewed → flat gray ring (g300)
//   3. tier="champion"        → single-color tier ring
//   4. (default)              → no ring, just the avatar circle
//
// IG never shows tier rings + story rings together. If both are passed,
// hasStory wins.

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tierColors, colors, storyRingGradient } from '../constants/theme';

interface AvatarProps {
  uri: string | null | undefined;
  size?: number;
  tier?: string;
  hasStory?: boolean;
  storyViewed?: boolean;
}

export function Avatar({
  uri,
  size = 40,
  tier,
  hasStory = false,
  storyViewed = false,
}: AvatarProps) {
  const ringSize = size + 6;
  const inner = size;

  // Story ring (gradient or viewed-gray) takes priority over tier ring.
  if (hasStory) {
    if (storyViewed) {
      return (
        <View
          style={[
            styles.flatRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: colors.g300,
            },
          ]}
        >
          <Inner uri={uri} size={inner} />
        </View>
      );
    }
    return (
      <LinearGradient
        colors={storyRingGradient as unknown as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          padding: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: ringSize - 4,
            height: ringSize - 4,
            borderRadius: (ringSize - 4) / 2,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Inner uri={uri} size={inner} />
        </View>
      </LinearGradient>
    );
  }

  // Tier ring fallback (only Champion shows; others are gray and barely visible)
  const tierColor = tier ? tierColors[tier] : null;
  if (tierColor && tier === 'champion') {
    return (
      <View
        style={[
          styles.flatRing,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: tierColor,
            borderWidth: 2,
          },
        ]}
      >
        <Inner uri={uri} size={inner} />
      </View>
    );
  }

  return <Inner uri={uri} size={inner} />;
}

function Inner({ uri, size }: { uri: string | null | undefined; size: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: colors.g100,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flatRing: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
