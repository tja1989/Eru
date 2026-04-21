import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Avatar } from './Avatar';
import { ShareButton } from './ShareButton';
import { PostActionSheet } from './PostActionSheet';
import { UgcBadge } from './UgcBadge';
import { ModerationBadge } from './ModerationBadge';
import { PostPointsBadge } from './PostPointsBadge';
import { RelativeTime } from './RelativeTime';
import { SponsoredCtaBar } from './SponsoredCtaBar';
import { CarouselDots } from './CarouselDots';
import { ReelTypeBadge } from './ReelTypeBadge';
import { colors, spacing } from '../constants/theme';
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
  // Optional: true when this card is the one currently in view (FlatList
  // viewability tracking). Only the active card's video plays; others pause
  // to save battery/bandwidth. Defaults to true for callers that don't wire
  // viewability (e.g. the detail page).
  isActive?: boolean;
  // Optional: fires after the author confirms a delete and the API call
  // succeeds. Parents (feed/profile screens) can use this to remove the card
  // from their list. Not wired into any screen yet — that's a later task.
  onDeleted?: (id: string) => void;
}

function formatDuration(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PostCard({ post, isActive = true, onDeleted }: PostCardProps) {
  const router = useRouter();
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [saved, setSaved] = useState(post.isSaved ?? false);
  const [disliked, setDisliked] = useState(post.isDisliked ?? false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [carouselIndex] = useState(0);
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  // Resolve mediaKind from derived field when present, falling back to best
  // inference from the legacy `type` + first media. This lets the feed pass
  // `mediaKind` directly (P6 derived) while keeping older callers working.
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
  const mediaAspect = isReel ? 4 / 5 : 1;
  const mediaHeight = SCREEN_WIDTH / mediaAspect;

  // Always call useVideoPlayer (Rules of Hooks). Pass null source when there
  // is no video — the player exists but has nothing to play.
  const player = useVideoPlayer(videoUrl ? { uri: videoUrl } : null, (p) => {
    p.loop = true;
    // Feed videos autoplay MUTED (Instagram behavior). Full audio happens
    // when the user taps into the Reels viewer.
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (!videoUrl) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, videoUrl, player]);

  // Credit view_sponsored +2 once after 2s of continuous visibility on a
  // sponsored post. Dedupe is inside useImpressionTimer (once per mount).
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

  const handleDislike = async () => {
    if (disliked) {
      setDisliked(false);
      await contentService.undislike(post.id).catch(() => { setDisliked(true); });
    } else {
      setDisliked(true);
      await contentService.dislike(post.id).catch((err: any) => {
        if (err?.response?.status === 409) return;
        setDisliked(false);
      });
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
    Alert.alert(
      'Delete this post?',
      'This cannot be undone.',
      [
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
      ],
    );
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

  const claimOffer = () => {
    earn('click_sponsored_cta', post.id);
    if (post.sponsorBusinessId) {
      router.push({ pathname: '/business/[id]', params: { id: post.sponsorBusinessId } });
    }
  };

  // Author label: business name when sponsored, else the creator's username.
  const authorLabel: string = post.isSponsored && post.sponsorName ? post.sponsorName : post.user?.username ?? '';
  const isSponsoredRow = !!post.isSponsored && !!post.sponsorName;

  return (
    <View style={styles.post}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.userRow}
          onPress={isSponsoredRow ? openSponsor : undefined}
          activeOpacity={isSponsoredRow ? 0.7 : 1}
        >
          <Avatar
            uri={post.sponsorAvatarUrl || post.user?.avatarUrl}
            size={34}
            tier={post.user?.tier}
          />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{authorLabel}</Text>
              {isSponsoredRow ? (
                <Text style={styles.sponsored}> • Sponsored</Text>
              ) : post.user?.isVerified ? (
                <View style={styles.verified}>
                  <Text style={{ fontSize: 8, color: '#fff' }}>✓</Text>
                </View>
              ) : null}
              {post.createdAt ? (
                <>
                  <Text style={styles.dot}> • </Text>
                  <RelativeTime iso={post.createdAt} />
                </>
              ) : null}
            </View>
            {post.locationLabel ? (
              <Text style={styles.location}>{post.locationLabel}</Text>
            ) : null}
            {(post.ugcBadge && !isSponsoredRow) || post.moderationBadge ? (
              <View style={styles.badgeRow}>
                <UgcBadge variant={isSponsoredRow ? null : post.ugcBadge ?? null} />
                <ModerationBadge variant={post.moderationBadge ?? null} />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          {post.pointsEarnedOnView ? (
            <PostPointsBadge points={post.pointsEarnedOnView} />
          ) : null}
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.more}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>

      {firstMedia && (
        <View style={[styles.mediaWrap, { height: mediaHeight }]}>
          {videoUrl ? (
            <>
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={[styles.image, { height: mediaHeight }]}
                  resizeMode="cover"
                />
              ) : null}
              <VideoView
                style={[styles.videoOverlay, { height: mediaHeight }]}
                player={player}
                contentFit="cover"
                nativeControls={false}
              />
              <View style={styles.playBtn} accessibilityLabel="play">
                <Text style={styles.playTri}>▶</Text>
              </View>
              {isReel ? (
                <View style={styles.reelBadgeWrap}>
                  <ReelTypeBadge durationSeconds={post.durationSeconds ?? firstMedia.durationSeconds ?? null} />
                </View>
              ) : post.durationSeconds ? (
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{formatDuration(post.durationSeconds)}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Image
              source={{ uri: imageUrl }}
              style={[styles.image, { height: mediaHeight }]}
              resizeMode="cover"
            />
          )}

          {post.isSponsored && post.offerUrl ? (
            <View style={styles.ctaBarWrap}>
              <SponsoredCtaBar onPress={claimOffer} />
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openDetail}
            style={styles.tapOverlay}
          />
        </View>
      )}

      {mediaKind === 'carousel' && post.carouselCount ? (
        <CarouselDots count={post.carouselCount} activeIndex={carouselIndex} />
      ) : null}

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike}>
            <Text style={{ fontSize: 26 }}>{liked ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDislike}
            accessibilityLabel="Not for me"
            accessibilityHint="Not for me — helps us improve your feed and affects creator score"
            accessibilityState={{ selected: disliked }}
          >
            <Text style={{ fontSize: 26, opacity: disliked ? 1 : 0.55, color: disliked ? '#E53E3E' : '#737373' }}>
              👎
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openDetail}>
            <Text style={{ fontSize: 26 }}>💬</Text>
          </TouchableOpacity>
          <ShareButton
            contentId={post.id}
            creatorUsername={post.user?.username ?? ''}
            caption={post.text ?? ''}
          />
        </View>
        <TouchableOpacity
          onPress={handleSave}
          accessibilityLabel="Save post"
          accessibilityState={{ selected: saved }}
        >
          <Text style={{ fontSize: 26, color: saved ? '#0095F6' : '#737373' }}>🔖</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>
      {post.type === 'poll' && post.pollOptions ? (
        <PollCard
          contentId={post.id}
          question={post.text ?? ''}
          pollOptions={post.pollOptions}
          userVote={post.userVote ?? null}
        />
      ) : post.type === 'thread' && post.threadParentId === null ? (
        post.parts && post.parts.length > 0 ? (
          <ThreadView parts={post.parts} />
        ) : (
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); openDetail(); }} style={styles.viewThreadBtn}>
            <Text style={styles.viewThreadText}>View thread →</Text>
          </TouchableOpacity>
        )
      ) : (
        post.text && (
          <Text style={styles.caption}>
            <Text style={styles.captionUser}>{post.user?.username} </Text>
            {post.text}
          </Text>
        )
      )}
      {post.commentCount > 0 && (
        <TouchableOpacity onPress={openDetail}>
          <Text style={styles.viewComments}>View all {post.commentCount} comments</Text>
        </TouchableOpacity>
      )}

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
  post: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  sponsored: { fontSize: 11, color: colors.g400, fontWeight: '500' },
  dot: { fontSize: 11, color: colors.g400 },
  location: { fontSize: 11, color: colors.g500, marginTop: 1 },
  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 3 },
  verified: { width: 13, height: 13, borderRadius: 6.5, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  more: { fontSize: 16, color: colors.g800, letterSpacing: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaWrap: { position: 'relative', width: SCREEN_WIDTH },
  image: { width: SCREEN_WIDTH, backgroundColor: colors.g100 },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    zIndex: 2,
    elevation: 2,
  },
  playBtn: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -24,
    marginLeft: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  playTri: { color: '#fff', fontSize: 20, marginLeft: 3 },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 3,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  reelBadgeWrap: { position: 'absolute', top: 12, left: 12, zIndex: 3 },
  ctaBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 4 },
  tapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    elevation: 5,
  },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6 },
  actionsLeft: { flexDirection: 'row', gap: 14 },
  likes: { paddingHorizontal: spacing.md, fontSize: 13, fontWeight: '600', color: colors.g800 },
  caption: { paddingHorizontal: spacing.md, paddingVertical: 4, fontSize: 13, color: colors.g800, lineHeight: 19 },
  captionUser: { fontWeight: '600' },
  viewComments: { paddingHorizontal: spacing.md, paddingBottom: 8, fontSize: 13, color: colors.g400 },
  viewThreadBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  viewThreadText: { fontSize: 13, color: colors.blue, fontWeight: '600' },
});
