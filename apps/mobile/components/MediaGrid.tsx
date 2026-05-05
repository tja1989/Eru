// apps/mobile/components/MediaGrid.tsx — IG 3-column thumbnail grid
//
// Drop-in replacement for the existing MediaGrid component. Renders a tight
// 3-col grid with 1px gutters, square crops, and a small "▶" badge on reels.
// Multi-image posts get a "⊞" stack badge.
//
// API matches the old component: pass `items` (any post-shaped object with
// `id`, `media[0].thumbnailUrl`, optional `type === 'reel'`, optional
// `media.length > 1`).

import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const GUTTER = 1;
const TILE = (SCREEN_W - 2 * GUTTER) / 3;

type Item = {
  id: string;
  type?: string;
  media?: Array<{ thumbnailUrl?: string | null; originalUrl?: string }>;
};

export function MediaGrid({ items }: { items: Item[] }) {
  const router = useRouter();

  return (
    <View style={mgStyles.grid}>
      {items.map((item) => {
        const thumb = item.media?.[0]?.thumbnailUrl ?? item.media?.[0]?.originalUrl;
        const isReel = item.type === 'reel';
        const isStack = (item.media?.length ?? 0) > 1;
        return (
          <TouchableOpacity
            key={item.id}
            style={mgStyles.tile}
            activeOpacity={0.85}
            onPress={() =>
              isReel
                ? router.push({ pathname: '/(tabs)/reels', params: { reelId: item.id } } as any)
                : router.push({ pathname: '/post/[id]', params: { id: item.id } } as any)
            }
          >
            {thumb ? (
              <Image source={{ uri: thumb }} style={mgStyles.thumb} />
            ) : (
              <View style={[mgStyles.thumb, mgStyles.thumbFallback]} />
            )}
            {isReel ? (
              <View style={mgStyles.badge}>
                <Text style={mgStyles.badgeText}>▶</Text>
              </View>
            ) : isStack ? (
              <View style={mgStyles.badge}>
                <Text style={mgStyles.badgeText}>⊞</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const mgStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: TILE, height: TILE, marginRight: GUTTER, marginBottom: GUTTER },
  thumb: { width: '100%', height: '100%', backgroundColor: colors.g100 },
  thumbFallback: { backgroundColor: colors.g200 },
  badge: {
    position: 'absolute',
    top: 6, right: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

// Make sure to remove default export from old MediaGrid if it exported default.
// This file uses named export, matching the import pattern in explore.tsx:
//   import { MediaGrid } from '../../components/MediaGrid';
