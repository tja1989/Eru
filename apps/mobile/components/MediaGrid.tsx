import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { useRouter } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 3) / 3;

export function MediaGrid({ items }: { items: any[] }) {
  const router = useRouter();

  const handlePress = (item: any) => {
    if (item.type === 'reel') {
      // Open Reels tab scrolled to this specific reel.
      router.push({ pathname: '/(tabs)/reels', params: { reelId: item.id } });
    } else {
      // Open post detail page.
      router.push({ pathname: '/post/[id]', params: { id: item.id } });
    }
  };

  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const uri = item.media?.[0]?.thumbnailUrl || item.media?.[0]?.originalUrl;
        return (
          <TouchableOpacity key={item.id} onPress={() => handlePress(item)} activeOpacity={0.8}>
            <Image source={{ uri }} style={styles.cell} />
            {item.type === 'reel' ? (
              <View style={styles.reelBadge}>
                <Text style={styles.reelBadgeText}>▶</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#E0E0E0' },
  reelBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reelBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
