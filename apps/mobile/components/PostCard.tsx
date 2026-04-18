import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Avatar } from './Avatar';
import { ShareButton } from './ShareButton';
import { PostActionSheet } from './PostActionSheet';
import { colors, spacing } from '../constants/theme';
import { contentService } from '../services/contentService';
import { usePointsStore } from '../stores/pointsStore';
import { useAuthStore } from '../stores/authStore';

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

export function PostCard({ post, isActive = true, onDeleted }: PostCardProps) {
  const router = useRouter();
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.isSaved);
  const [sheetOpen, setSheetOpen] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');

  // Detect whether this post's media is a video — either because the content
  // itself is a reel or because the first media attachment is a video.
  const mediaItem = post.media?.[0];
  const isVideo = post.type === 'reel' || mediaItem?.type === 'video';
  const videoUrl = isVideo ? mediaItem?.originalUrl : null;
  const imageUrl = mediaItem?.thumbnailUrl || mediaItem?.originalUrl;

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

  return (
    <View style={styles.post}>
      <View style={styles.header}>
        <View style={styles.userRow}>
          <Avatar uri={post.user?.avatarUrl} size={34} tier={post.user?.tier} />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{post.user?.username}</Text>
              {post.user?.isVerified && <View style={styles.verified}><Text style={{ fontSize: 8, color: '#fff' }}>✓</Text></View>}
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.more}>•••</Text>
        </TouchableOpacity>
      </View>

      {mediaItem && (
        <View style={styles.mediaWrap}>
          {videoUrl ? (
            <>
              {/* Poster behind VideoView so the card has something to show
                  while the video buffers, and as a fallback if playback fails. */}
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
              ) : null}
              <VideoView
                style={styles.videoOverlay}
                player={player}
                contentFit="cover"
                nativeControls={false}
              />
            </>
          ) : (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          )}

          {/* Play badge — shown only for video/reel so users know it's tappable */}
          {isVideo ? (
            <View style={styles.playBadge} pointerEvents="none">
              <Text style={styles.playBadgeText}>▶</Text>
            </View>
          ) : null}

          {/* Transparent tap-catching overlay — sits ABOVE VideoView (which
              swallows touches as a native view). Works reliably under the
              new React Native architecture where child-level pointerEvents
              doesn't always propagate through native surfaces. */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={openDetail}
            style={styles.tapOverlay}
          />
        </View>
      )}

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike}><Text style={{ fontSize: 26 }}>{liked ? '❤️' : '🤍'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={openDetail}>
            <Text style={{ fontSize: 26 }}>💬</Text>
          </TouchableOpacity>
          <ShareButton
            contentId={post.id}
            creatorUsername={post.user?.username ?? ''}
            caption={post.text ?? ''}
          />
        </View>
        <TouchableOpacity onPress={() => { setSaved(!saved); earn('save', post.id); }}>
          <Text style={{ fontSize: 26 }}>{saved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.likes}>{likeCount.toLocaleString()} likes</Text>
      {post.text && (
        <Text style={styles.caption}><Text style={styles.captionUser}>{post.user?.username} </Text>{post.text}</Text>
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
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  username: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  verified: { width: 13, height: 13, borderRadius: 6.5, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  more: { fontSize: 16, color: colors.g800, letterSpacing: 2 },
  mediaWrap: { position: 'relative', width: SCREEN_WIDTH, height: SCREEN_WIDTH },
  image: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: colors.g100 },
  // VideoView sits on top of the poster Image. Matches image size exactly.
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    zIndex: 2,
    elevation: 2,
  },
  // Transparent overlay above everything — captures taps since the native
  // VideoView would otherwise eat them. Higher zIndex than the play badge.
  tapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
    elevation: 5,
  },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 64,
    height: 64,
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
    elevation: 3,
  },
  playBadgeText: { color: '#fff', fontSize: 28, marginLeft: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6 },
  actionsLeft: { flexDirection: 'row', gap: 14 },
  likes: { paddingHorizontal: spacing.md, fontSize: 13, fontWeight: '600', color: colors.g800 },
  caption: { paddingHorizontal: spacing.md, paddingVertical: 4, fontSize: 13, color: colors.g800, lineHeight: 19 },
  captionUser: { fontWeight: '600' },
  viewComments: { paddingHorizontal: spacing.md, paddingBottom: 8, fontSize: 13, color: colors.g400 },
});
