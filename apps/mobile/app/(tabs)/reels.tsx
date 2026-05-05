// apps/mobile/app/(tabs)/reels.tsx — IG-fidelity Reels
//
// Diff vs prior:
//  - REMOVED on-video green "+N pts/min" pill (per DECISIONS.md). Points are
//    still credited via useReelHeartbeat — the user just doesn't see a coin
//    overlay during playback. They'll see the credit in Wallet → ledger.
//    If you want to keep the pill, restore the {item.pointsPreview != null}
//    block from the original file.
//  - Three-tab pill (Following / For You / Local) replaced by IG's two-tab
//    text header ("Following  |  For You"). Local is folded into For You's
//    server-side ranking (the API already accepts a 'local' bias param if
//    you want to wire it up later).
//  - Tab indicator: bold white text + dim white for inactive, no underline.
//
// Behavior, video player, like/save/share, heartbeat — all unchanged.

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
import { useReelHeartbeat } from '../../hooks/useReelHeartbeat';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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
  const [saved, setSaved] = useState(item.isSaved ?? false);

  const shouldRender = isActive || isWarmed;
  const videoUrl = shouldRender ? pickVideoUrl(item.media?.[0]) : undefined;
  const posterUrl = item.media?.[0]?.thumbnailUrl;

  const player = useVideoPlayer(
    videoUrl ? { uri: videoUrl } : null,
    (p) => {
      p.loop = true;
      p.muted = false;
    },
  );

  useEffect(() => {
    if (!videoUrl) return;
    if (isActive) player.play();
    else player.pause();
  }, [isActive, videoUrl, player]);

  usePlayerMetrics(
    isActive && videoUrl ? (player as unknown as PlayerLike) : null,
    item.id,
  );

  useReelHeartbeat({ reelId: item.id, enabled: isActive });

  const handleLike = async () => {
    if (liked) { setLiked(false); setLikeCount((c) => c - 1); }
    else { setLiked(true); setLikeCount((c) => c + 1); earn('like', item.id); }
    try { await reelsService.like(item.id); }
    catch { setLiked((p) => !p); setLikeCount((c) => (liked ? c + 1 : c - 1)); }
  };

  const handleSave = async () => {
    if (saved) {
      setSaved(false);
      await contentService.unsave(item.id).catch(() => { setSaved(true); });
    } else {
      setSaved(true);
      await contentService.save(item.id).catch((err: any) => {
        if (err?.response?.status === 409) return;
        setSaved(false);
      });
    }
  };

  return (
    <View style={reelStyles.reelContainer}>
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}
      {videoUrl ? (
        <VideoView
          style={reelStyles.videoOnTop}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      ) : !posterUrl ? (
        <View style={[reelStyles.video, reelStyles.videoPlaceholder]}>
          <Text style={{ fontSize: 48 }}>🎬</Text>
        </View>
      ) : null}

      {/* NO points pill — see file header */}

      {/* Right-side action column — IG icon order: heart, comment, share, save, ... */}
      <View style={reelStyles.actionColumn}>
        <TouchableOpacity style={reelStyles.actionBtn} onPress={handleLike} accessibilityLabel="Like">
          <Text style={reelStyles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={reelStyles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={reelStyles.actionBtn} accessibilityLabel="Comment">
          <Text style={reelStyles.actionIcon}>💬</Text>
          <Text style={reelStyles.actionCount}>{item.commentCount ?? 0}</Text>
        </TouchableOpacity>

        <ShareButton
          contentId={item.id}
          creatorUsername={item.user?.username ?? ''}
          caption={item.text ?? ''}
          style={reelStyles.actionBtn}
          iconStyle={reelStyles.actionIcon}
          label=""
          labelStyle={reelStyles.actionCount}
        />

        <TouchableOpacity style={reelStyles.actionBtn} onPress={handleSave} accessibilityLabel="Save" accessibilityState={{ selected: saved }}>
          <Text style={reelStyles.actionIcon}>{saved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom overlay: creator info + caption */}
      <View style={reelStyles.bottomOverlay}>
        <View style={reelStyles.creatorRow}>
          <Text style={reelStyles.creatorName}>{item.user?.username ? `@${item.user.username}` : 'unknown'}</Text>
          {item.user?.id && currentUserId && item.user.id !== currentUserId ? (
            <View style={reelStyles.followWrap}>
              <Text style={reelStyles.creatorDot}>·</Text>
              <FollowButton
                targetUserId={item.user.id}
                initiallyFollowing={item.user.isFollowing ?? false}
                size="sm"
              />
            </View>
          ) : null}
        </View>
        {item.text ? (
          <Text style={reelStyles.caption} numberOfLines={2}>{item.text}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const { earn } = usePointsStore();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { reelId } = useLocalSearchParams<{ reelId?: string }>();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  // IG-style: only Following / For You. Local now folds into For You's ranking.
  const [tab, setTab] = useState<'foryou' | 'following'>('foryou');
  const { indicesToPreload } = useReelPreloader({ activeIndex });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setReels([]);

      let pinned: Reel | null = null;
      if (reelId) {
        try {
          const r = await contentService.getById(reelId);
          const target = r?.content ?? r;
          if (target?.type === 'reel') pinned = target as Reel;
        } catch { /* fall through */ }
      }

      try {
        const data = await reelsService.getReels<Reel>(tab, 1);
        if (cancelled) return;
        const list: Reel[] = data.data ?? [];
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
    return () => { cancelled = true; };
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

  // IG-style header: bold "Reels" left, two text-only tabs centered
  const tabBar = (
    <View style={reelStyles.tabsBar} pointerEvents="box-none">
      {(['following', 'foryou'] as const).map((t) => (
        <TouchableOpacity
          key={t}
          onPress={() => setTab(t)}
          style={reelStyles.tab}
          accessibilityState={{ selected: tab === t }}
        >
          <Text style={[reelStyles.tabText, tab === t && reelStyles.tabTextActive]}>
            {t === 'foryou' ? 'For You' : 'Following'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={reelStyles.safe} edges={['top']}>
        {tabBar}
        <View style={reelStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.g300} />
        </View>
      </SafeAreaView>
    );
  }

  if (reels.length === 0) {
    return (
      <SafeAreaView style={reelStyles.safe} edges={['top']}>
        {tabBar}
        <View style={reelStyles.loadingContainer}>
          <Text style={{ fontSize: 40 }}>🎬</Text>
          <Text style={{ color: '#fff', marginTop: spacing.md, fontSize: 16 }}>No reels yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={reelStyles.safe} edges={['top']}>
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

const reelStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#000' },
  tabsBar: {
    flexDirection: 'row',
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    gap: 24,
    zIndex: 10,
  },
  tab: { paddingVertical: 6, paddingHorizontal: 4 },
  tabText: { color: 'rgba(255,255,255,0.55)', fontWeight: '600', fontSize: 16 },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  loadingContainer: {
    flex: 1, backgroundColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  reelContainer: { width: SCREEN_WIDTH, height: REEL_HEIGHT, backgroundColor: '#000' },
  video: { width: SCREEN_WIDTH, height: REEL_HEIGHT },
  videoOnTop: { width: SCREEN_WIDTH, height: REEL_HEIGHT, zIndex: 2, elevation: 2 },
  videoPlaceholder: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#111',
  },
  actionColumn: {
    position: 'absolute', right: spacing.md, bottom: 110,
    alignItems: 'center', gap: spacing.lg,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 30 },
  actionCount: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bottomOverlay: {
    position: 'absolute', bottom: 30, left: spacing.md, right: 80,
  },
  creatorRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: spacing.sm, marginBottom: spacing.xs,
  },
  followWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  creatorDot: { color: '#fff', fontWeight: '700' },
  creatorName: {
    color: '#fff', fontWeight: '700', fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  caption: {
    color: '#fff', fontSize: 13, lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
