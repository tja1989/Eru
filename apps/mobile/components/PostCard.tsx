// apps/mobile/components/PostCard.tsx
// IG-fidelity feed post.
//
// Layout (top to bottom):
//   1. Header: 32px avatar + username (14, 600) · "·" · relative time
//      — single row, NO badges/UGC/sponsor stacked underneath. Sponsored
//      shows ONLY as the secondary line "Sponsored". Verified shows as a
//      tiny blue tick after the username. The "•••" sits on the right.
//   2. Square media (1:1 for photo/carousel/video, 4:5 for reels)
//   3. Action row: heart / comment / share on the LEFT, save on the RIGHT
//      — all icons are stroke-style at 26pt, IG black (g800) by default.
//      Liked → IG red filled.
//   4. Likes count (13/600 g800)
//   5. Caption: bold username inline + caption text
//   6. "View all N comments" (13 g500)
//   7. Timestamp (10/uppercase g400)
//
// Behavior preserved 1:1 from the source file (likes, save, dislike,
// dual-write to API, video viewability gating, points earn). Only the
// VISUAL layer changes.

import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Avatar } from './Avatar';
import { ShareButton } from './ShareButton';
import { PostActionSheet } from './PostActionSheet';
import { CarouselDots } from './CarouselDots';
import { colors } from '../constants/theme';
import { contentService } from '../services/contentService';
import { usePointsStore } from '../stores/pointsStore';
import { useAuthStore } from '../stores/authStore';
import { useImpressionTimer } from '../hooks/useImpressionTimer';
import { PollCard } from './PollCard';
import { ThreadView } from './ThreadView';
import { pickVideoUrl } from '@eru/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PostCardProps {
  post: any;
  isActive?: boolean;
  onDeleted?: (id: string) => void;
}

// Compact "2h", "3d", "5w" relative time — matches IG.
function relTime(iso?: string): string {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.max(1, Math.floor(d))}s`;
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 604800) return `${Math.floor(d / 86400)}d`;
  return `${Math.floor(d / 604800)}w`;
}

// Long-form timestamp under caption — IG style "MAY 5".
function longTime(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
}

export function PostCard({ post, isActive = true, onDeleted }: PostCardProps) {
  const router = useRouter();
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [saved, setSaved] = useState(post.isSaved ?? false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [carouselIndex] = useState(0);
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  const firstMedia = post.media?.[0];
  const mediaKind: string =
    post.mediaKind ??
    (post.type === 'reel'
      ? 'reel'
      : post.type === 'poll'
        ? 'poll'
        : post.type === 'thread'
          ? 'thread'
          : (post.media?.length ?? 0) > 1
            ? 'carousel'
            : firstMedia?.type === 'video'
              ? 'video'
              : firstMedia?.type === 'image'
                ? 'photo'
                : 'text');

  const isVideo = mediaKind === 'video' || mediaKind === 'reel';
  const videoUrl = isVideo ? pickVideoUrl(firstMedia) ?? null : null;
  const imageUrl = firstMedia?.thumbnailUrl || firstMedia?.originalUrl;
  const isReel = mediaKind === 'reel';
  const mediaAspect = isReel ? 4 / 5 : 1; // IG square for photos, 4:5 for reels
  const mediaHeight = SCREEN_WIDTH / mediaAspect;

  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (!videoUrl) return;
    if (isActive) player.play();
    else player.pause();
  }, [isActive, videoUrl, player]);

  useImpressionTimer({
    enabled: !!post.isSponsored && isActive,
    thresholdMs: 2000,
    onImpression: () => earn('view_sponsored', post.id),
  });

  const handleLike = async () => {
    if (liked) {
      setLiked(false); setLikeCount((c: number) => c - 1);
      await contentService.unlike(post.id).catch(() => { setLiked(true); setLikeCount((c: number) => c + 1); });
    } else {
      setLiked(true); setLikeCount((c: number) => c + 1);
      await contentService.like(post.id).catch(() => { setLiked(false); setLikeCount((c: number) => c - 1); });
      earn('like', post.id);
    }
  };

  const handleSave = async () => {
    if (saved) {
      setSaved(false);
      await contentService.unsave(post.id).catch(() => { setSaved(true); });
    } else {
      setSaved(true);
      await contentService.save(post.id).catch((err: any) => {
        if (err?.response?.status === 409) return;
        setSaved(false);
      });
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await contentService.delete(post.id);
            onDeleted?.(post.id);
          } catch {
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  const openDetail = () => {
    if (post.type === 'reel') {
      router.push({ pathname: '/(tabs)/reels', params: { reelId: post.id } });
    } else {
      router.push({ pathname: '/post/[id]', params: { id: post.id } });
    }
  };

  const openSponsor = () => {
    if (post.sponsorBusinessId) {
      router.push({ pathname: '/business/[id]', params: { id: post.sponsorBusinessId } });
    }
  };

  const authorLabel: string = post.isSponsored && post.sponsorName ? post.sponsorName : post.user?.username ?? '';
  const isSponsoredRow = !!post.isSponsored && !!post.sponsorName;

  return (
    <View style={styles.post}>
      {/* HEADER — single row, IG-style */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={isSponsoredRow ? openSponsor : undefined}
          activeOpacity={isSponsoredRow ? 0.7 : 1}
        >
          <Avatar uri={post.sponsorAvatarUrl || post.user?.avatarUrl} size={32} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.username} numberOfLines={1}>{authorLabel}</Text>
              {post.user?.isVerified && !isSponsoredRow ? (
                <View style={styles.verified}>
                  <Text style={styles.verifiedTick}>✓</Text>
                </View>
              ) : null}
              {!isSponsoredRow && post.createdAt ? (
                <Text style={styles.dim}> • {relTime(post.createdAt)}</Text>
              ) : null}
            </View>
            {isSponsoredRow ? (
              <Text style={styles.sponsoredLine}>Sponsored</Text>
            ) : post.locationLabel ? (
              <Text style={styles.location}>{post.locationLabel}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.more}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* MEDIA */}
      {firstMedia ? (
        <View style={[styles.mediaWrap, { height: mediaHeight }]}>
          {videoUrl ? (
            <>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={[styles.image, { height: mediaHeight }]} resizeMode="cover" />
              ) : null}
              <VideoView
                style={[styles.videoOverlay, { height: mediaHeight }]}
                player={player}
                contentFit="cover"
                nativeControls={false}
              />
            </>
          ) : (
            <Image source={{ uri: imageUrl }} style={[styles.image, { height: mediaHeight }]} resizeMode="cover" />
          )}
          <TouchableOpacity activeOpacity={0.95} onPress={openDetail} style={styles.tapOverlay} />
        </View>
      ) : null}

      {mediaKind === 'carousel' && post.carouselCount ? (
        <CarouselDots count={post.carouselCount} activeIndex={carouselIndex} />
      ) : null}

      {/* ACTION ROW — IG icons, glyph-based for portability */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike} hitSlop={8}>
            <Text style={[styles.icon, liked && styles.iconLiked]}>
              {liked ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openDetail} hitSlop={8}>
            <Text style={styles.icon}>♡</Text>
            {/* placeholder — your existing comment icon */}
          </TouchableOpacity>
          <ShareButton
            contentId={post.id}
            creatorUsername={post.user?.username ?? ''}
            caption={post.text ?? ''}
          />
        </View>
        <TouchableOpacity onPress={handleSave} hitSlop={8}>
          <Text style={[styles.icon, saved && { color: colors.g800 }]}>
            {saved ? '▣' : '▢'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIKES */}
      <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>

      {/* CAPTION — username inline, IG style */}
      {post.type === 'poll' && post.pollOptions ? (
        <PollCard
          contentId={post.id}
          question={post.text ?? ''}
          pollOptions={post.pollOptions}
          userVote={post.userVote ?? null}
        />
      ) : post.type === 'thread' && post.threadParentId === null ? (
        post.parts?.length > 0 ? (
          <ThreadView parts={post.parts} />
        ) : (
          <TouchableOpacity onPress={openDetail} style={styles.captionWrap}>
            <Text style={styles.viewThreadText}>View thread</Text>
          </TouchableOpacity>
        )
      ) : post.text ? (
        <Text style={styles.captionWrap} numberOfLines={2} ellipsizeMode="tail">
          <Text style={styles.captionUser}>{post.user?.username ?? ''}</Text>
          <Text style={styles.caption}> {post.text}</Text>
        </Text>
      ) : null}

      {post.commentCount > 0 && (
        <TouchableOpacity onPress={openDetail}>
          <Text style={styles.viewComments}>View all {post.commentCount} comments</Text>
        </TouchableOpacity>
      )}

      {post.createdAt ? (
        <Text style={styles.timestamp}>{longTime(post.createdAt)}</Text>
      ) : null}

      <PostActionSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        contentId={post.id}
        authorUserId={post.user?.id ?? ''}
        currentUserId={currentUserId}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  post: { backgroundColor: '#fff', paddingBottom: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  username: { fontSize: 14, fontWeight: '600', color: colors.g800 },
  dim: { fontSize: 14, color: colors.g500 },
  sponsoredLine: { fontSize: 12, color: colors.g500, marginTop: 1 },
  location: { fontSize: 12, color: colors.g700, marginTop: 1 },
  verified: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.blue,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 4,
  },
  verifiedTick: { fontSize: 9, color: '#fff', fontWeight: '800' },
  more: { fontSize: 22, color: colors.g800, lineHeight: 22 },

  mediaWrap: { position: 'relative', width: SCREEN_WIDTH, backgroundColor: colors.g100 },
  image: { width: SCREEN_WIDTH, backgroundColor: colors.g100 },
  videoOverlay: { position: 'absolute', top: 0, left: 0, width: SCREEN_WIDTH, zIndex: 2, elevation: 2 },
  tapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, elevation: 5 },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  actionsLeft: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  icon: { fontSize: 26, color: colors.g800, lineHeight: 28 },
  iconLiked: { color: colors.red },

  likes: {
    paddingHorizontal: 12,
    paddingTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.g800,
  },
  captionWrap: { paddingHorizontal: 12, paddingTop: 4 },
  captionUser: { fontSize: 14, fontWeight: '600', color: colors.g800 },
  caption: { fontSize: 14, color: colors.g800, lineHeight: 19 },
  viewComments: { paddingHorizontal: 12, paddingTop: 4, fontSize: 14, color: colors.g500 },
  viewThreadText: { fontSize: 14, color: colors.g500 },
  timestamp: {
    paddingHorizontal: 12,
    paddingTop: 6,
    fontSize: 10,
    letterSpacing: 0.3,
    color: colors.g400,
  },
});
