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
import { useLocalSearchParams } from 'expo-router';
import { reelsService } from '../../services/reelsService';
import { contentService } from '../../services/contentService';
import { usePointsStore } from '../../stores/pointsStore';
import { useAuthStore } from '../../stores/authStore';
import { FollowButton } from '../../components/FollowButton';
import { ShareButton } from '../../components/ShareButton';
import { colors, spacing } from '../../constants/theme';
import { pickVideoUrl } from '@eru/shared';
import { useReelPreloader } from '../../hooks/useReelPreloader';
import { usePlayerMetrics, type PlayerLike } from '../../hooks/usePlayerMetrics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
// Leave room for the tab bar (~56px) + safe-area insets (~34px on iPhone)
const REEL_HEIGHT = SCREEN_HEIGHT - 90;

interface Reel {
  id: string;
  user?: { id: string; username: string; avatarUrl?: string; tier?: string; isFollowing?: boolean };
  text?: string;
  media?: Array<{
    originalUrl: string;
    thumbnailUrl?: string | null;
    video360pUrl?: string | null;
    video540pUrl?: string | null;
    video720pUrl?: string | null;
    video1080pUrl?: string | null;
    hlsManifestUrl?: string | null;
  }>;
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
  isDisliked?: boolean;
  isSaved?: boolean;
  pointsPreview?: number;
}

function ReelItem({
  item,
  isActive,
  isWarmed,
  currentUserId,
}: {
  item: Reel;
  isActive: boolean;
  isWarmed: boolean;
  currentUserId?: string;
}) {
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(item.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(item.likeCount ?? 0);
  const [disliked, setDisliked] = useState(item.isDisliked ?? false);
  const [saved, setSaved] = useState(item.isSaved ?? false);

  // Only allocate a player for the active reel and any neighbours the
  // preloader says we should warm. Off-window items pass null source so
  // expo-video disposes the player and frees the segment cache.
  const shouldRender = isActive || isWarmed;
  const videoUrl = shouldRender ? pickVideoUrl(item.media?.[0]) : undefined;
  const posterUrl = item.media?.[0]?.thumbnailUrl;

  // useVideoPlayer must run on every render (Rules of Hooks). The setup
  // callback only configures the player — we deliberately don't auto-play
  // here, otherwise a freshly-warmed neighbour would emit sound for one
  // frame before the isActive effect pauses it.
  const player = useVideoPlayer(
    videoUrl ? { uri: videoUrl } : null,
    (p) => {
      p.loop = true;
      p.muted = false;
    },
  );

  useEffect(() => {
    if (!videoUrl) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, videoUrl, player]);

  // Meter only the active reel — preloaded neighbours haven't actually
  // played anything yet, so their stats would skew TTFF / rebuffer numbers.
  // Cast through unknown because expo-video's addListener is event-typed
  // and our PlayerLike is the loosened structural shape.
  usePlayerMetrics(
    isActive && videoUrl ? (player as unknown as PlayerLike) : null,
    item.id,
  );

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

  const handleDislike = async () => {
    if (disliked) {
      setDisliked(false);
      await contentService.undislike(item.id).catch(() => { setDisliked(true); });
    } else {
      setDisliked(true);
      await contentService.dislike(item.id).catch((err: any) => {
        // 409 = already disliked — optimistic state is correct, keep it
        if (err?.response?.status === 409) return;
        setDisliked(false);
      });
    }
  };

  const handleSave = async () => {
    if (saved) {
      setSaved(false);
      await contentService.unsave(item.id).catch(() => { setSaved(true); });
    } else {
      setSaved(true);
      await contentService.save(item.id).catch((err: any) => {
        // 409 = already saved — optimistic state is correct, keep it
        if (err?.response?.status === 409) return;
        setSaved(false);
      });
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
          style={styles.videoOnTop}
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

        <TouchableOpacity style={styles.actionBtn} onPress={handleDislike} accessibilityLabel="Not for me" accessibilityState={{ selected: disliked }}>
          <Text style={[styles.actionIcon, { color: disliked ? '#E53E3E' : '#fff' }]}>👎</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleSave} accessibilityLabel="Save post" accessibilityState={{ selected: saved }}>
          <Text style={[styles.actionIcon, { color: saved ? '#0095F6' : '#fff' }]}>🔖</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{item.commentCount ?? 0}</Text>
        </TouchableOpacity>

        <ShareButton
          contentId={item.id}
          creatorUsername={item.user?.username ?? ''}
          caption={item.text ?? ''}
          style={styles.actionBtn}
          iconStyle={styles.actionIcon}
          label="Share"
          labelStyle={styles.actionCount}
        />
      </View>

      {/* Bottom overlay: creator info + caption */}
      <View style={styles.bottomOverlay}>
        <View style={styles.creatorRow}>
          <Text style={styles.creatorName}>@{item.user?.username ?? 'unknown'}</Text>
          {item.user?.id && currentUserId && item.user.id !== currentUserId ? (
            <FollowButton
              targetUserId={item.user.id}
              initiallyFollowing={item.user.isFollowing ?? false}
              size="sm"
            />
          ) : null}
        </View>
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
  const currentUserId = useAuthStore((s) => s.user?.id);
  // reelId is set when the user taps a reel thumbnail from Explore. We fetch
  // that specific reel and prepend it so it's the first thing they see.
  const { reelId } = useLocalSearchParams<{ reelId?: string }>();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<'foryou' | 'following' | 'local'>('foryou');
  const { indicesToPreload } = useReelPreloader({ activeIndex });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      // Clear stale items before fetching so the FlatList doesn't flash
      // results from the previous tab while the new tab is loading.
      setReels([]);

      // If deep-linked to a specific reel, fetch it first so we can pin it
      // to the top of the list even if it's not in page 1 of /reels.
      let pinned: Reel | null = null;
      if (reelId) {
        try {
          const r = await contentService.getById(reelId);
          const target = r?.content ?? r;
          if (target?.type === 'reel') pinned = target as Reel;
        } catch {
          // ignore — if the specific reel fails to load we fall back to the list
        }
      }

      try {
        const data = await reelsService.getReels(tab, 1);
        if (cancelled) return;
        const list: Reel[] = data.data ?? data.reels ?? data.items ?? [];
        if (pinned) {
          const deduped = list.filter((r) => r.id !== pinned!.id);
          setReels([pinned, ...deduped]);
        } else {
          setReels(list);
        }
        earn('view_reel');
      } catch {
        if (cancelled) return;
        setReels(pinned ? [pinned] : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reelId, tab]);

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

  const tabBar = (
    <View style={styles.tabs} pointerEvents="box-none">
      {(['following', 'foryou', 'local'] as const).map((t) => (
        <TouchableOpacity
          key={t}
          onPress={() => setTab(t)}
          style={[styles.tab, tab === t && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
            {t === 'foryou' ? 'For You' : t === 'following' ? 'Following' : 'Local'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {tabBar}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.g400} />
        </View>
      </SafeAreaView>
    );
  }

  if (reels.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {tabBar}
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 40 }}>🎬</Text>
          <Text style={{ color: '#fff', marginTop: spacing.md, fontSize: 16 }}>No reels yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {tabBar}
      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ReelItem
            item={item}
            isActive={index === activeIndex}
            isWarmed={indicesToPreload.includes(index)}
            currentUserId={currentUserId}
          />
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
  tabs: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    gap: 20,
    zIndex: 10,
  },
  tab: { paddingVertical: 6, paddingHorizontal: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '800' },
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
  // Same dimensions as `video` but forced on top of the poster image so the
  // native VideoView surface isn't hidden underneath the <Image> fallback.
  videoOnTop: {
    width: SCREEN_WIDTH,
    height: REEL_HEIGHT,
    zIndex: 2,
    elevation: 2,
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
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
