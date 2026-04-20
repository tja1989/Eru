import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 3) / 3;

// One cell of the grid. Lifted out so we can use useVideoPlayer per cell —
// hooks can't run inside .map() callbacks.
function GridCell({ item, onPress }: { item: any; onPress: () => void }) {
  const media = item.media?.[0];
  const isVideo = item.type === 'reel' || media?.type === 'video';
  const thumbnail = media?.thumbnailUrl;
  const fallbackToVideoFrame = isVideo && !thumbnail && media?.originalUrl;

  // When we have no still thumbnail (MediaConvert hasn't generated one yet),
  // mount a paused VideoView so the video's first frame stands in. The player
  // is created with autoPlay disabled so we don't waste battery.
  const player = useVideoPlayer(
    fallbackToVideoFrame ? { uri: media.originalUrl } : null,
    (p) => {
      p.muted = true;
      p.pause();
    },
  );

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {fallbackToVideoFrame ? (
        <VideoView
          player={player}
          style={styles.cell}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <Image source={{ uri: thumbnail || media?.originalUrl }} style={styles.cell} />
      )}
      {isVideo ? (
        <View style={styles.reelBadge}>
          <Text style={styles.reelBadgeText}>▶</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export function MediaGrid({ items }: { items: any[] }) {
  const router = useRouter();

  const handlePress = (item: any) => {
    if (item.type === 'reel') {
      router.push({ pathname: '/(tabs)/reels', params: { reelId: item.id } });
    } else {
      router.push({ pathname: '/post/[id]', params: { id: item.id } });
    }
  };

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <GridCell key={item.id} item={item} onPress={() => handlePress(item)} />
      ))}
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
