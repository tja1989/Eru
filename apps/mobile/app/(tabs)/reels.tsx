import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { reelsService } from '../../services/reelsService';
import { usePointsStore } from '../../stores/pointsStore';
import { colors, spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Leave room for the tab bar (~56px) + safe-area insets (~34px on iPhone)
const REEL_HEIGHT = SCREEN_HEIGHT - 90;

interface Reel {
  id: string;
  user?: { username: string; avatarUrl?: string; tier?: string };
  text?: string;
  media?: Array<{ originalUrl: string; thumbnailUrl?: string | null }>;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  pointsPreview?: number;
}

function ReelItem({
  item,
  isActive,
}: {
  item: Reel;
  isActive: boolean;
}) {
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);

  const videoUrl = item.media?.[0]?.originalUrl;
  const posterUrl = item.media?.[0]?.thumbnailUrl;

  // expo-video's player hook must run unconditionally (Rules of Hooks). We
  // pass null when there's no URL so the hook stays stable per-render.
  const player = useVideoPlayer(videoUrl ?? null, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (!videoUrl) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, videoUrl, player]);

  const handleLike = async () => {
    if (liked) {
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      setLiked(true);
      setLikeCount((c) => c + 1);
      earn('like', item.id);
    }
    try {
      await reelsService.like(item.id);
    } catch {
      // revert on error
      setLiked((prev) => !prev);
      setLikeCount((c) => (liked ? c + 1 : c - 1));
    }
  };

  return (
    <View style={styles.reelContainer}>
      {/* Poster image — shown under the VideoView while video loads, and as a
          graceful fallback if expo-video can't play (e.g. in Expo Go). */}
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}
      {/* Video */}
      {videoUrl ? (
        <VideoView
          style={styles.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      ) : !posterUrl ? (
        <View style={[styles.video, styles.videoPlaceholder]}>
          <Text style={{ fontSize: 48 }}>🎬</Text>
        </View>
      ) : null}

      {/* Points indicator top-right */}
      {item.pointsPreview != null && (
        <View style={styles.pointsIndicator}>
          <Text style={styles.pointsText}>+{item.pointsPreview} pts</Text>
        </View>
      )}

      {/* Right-side action column */}
      <View style={styles.actionColumn}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
          <Text style={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{item.commentCount ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => earn('share', item.id)}
        >
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionCount}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom overlay: creator info + caption */}
      <View style={styles.bottomOverlay}>
        <Text style={styles.creatorName}>@{item.user?.username ?? 'unknown'}</Text>
        {item.text ? (
          <Text style={styles.caption} numberOfLines={2}>
            {item.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const { earn } = usePointsStore();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    reelsService
      .getReels('foryou', 1)
      .then((data) => {
        setReels(data.data ?? data.reels ?? data.items ?? []);
        earn('view_reel');
      })
      .catch(() => setReels([]))
      .finally(() => setLoading(false));
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
        earn('view_reel');
      }
    },
    [earn],
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 40 }}>🎬</Text>
        <Text style={{ color: '#fff', marginTop: spacing.md, fontSize: 16 }}>No reels yet</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelItem item={item} isActive={index === activeIndex} />
        )}
        pagingEnabled
        snapToInterval={REEL_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reelContainer: {
    width: SCREEN_WIDTH,
    height: REEL_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    width: SCREEN_WIDTH,
    height: REEL_HEIGHT,
  },
  videoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  pointsIndicator: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.lg,
    backgroundColor: 'rgba(16,185,129,0.85)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pointsText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  actionColumn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 100,
    alignItems: 'center',
    gap: spacing.xl,
  },
  actionBtn: { alignItems: 'center', gap: spacing.xs },
  actionIcon: { fontSize: 30 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bottomOverlay: {
    position: 'absolute',
    bottom: 40,
    left: spacing.lg,
    right: 80,
  },
  creatorName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
