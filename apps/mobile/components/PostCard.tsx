import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { colors, spacing } from '../constants/theme';
import { contentService } from '../services/contentService';
import { usePointsStore } from '../stores/pointsStore';

const SCREEN_WIDTH = Dimensions.get('window').width;

export function PostCard({ post }: { post: any }) {
  const router = useRouter();
  const { earn } = usePointsStore();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.isSaved);

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
        <Text style={styles.more}>•••</Text>
      </View>

      {post.media?.length > 0 && (
        <Image source={{ uri: post.media[0].thumbnailUrl || post.media[0].originalUrl }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          <TouchableOpacity onPress={handleLike}><Text style={{ fontSize: 26 }}>{liked ? '❤️' : '🤍'}</Text></TouchableOpacity>
          <TouchableOpacity><Text style={{ fontSize: 26 }}>💬</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => earn('share', post.id)}><Text style={{ fontSize: 26 }}>📤</Text></TouchableOpacity>
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
        <Text style={styles.viewComments}>View all {post.commentCount} comments</Text>
      )}
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
  image: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: colors.g100 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 6 },
  actionsLeft: { flexDirection: 'row', gap: 14 },
  likes: { paddingHorizontal: spacing.md, fontSize: 13, fontWeight: '600', color: colors.g800 },
  caption: { paddingHorizontal: spacing.md, paddingVertical: 4, fontSize: 13, color: colors.g800, lineHeight: 19 },
  captionUser: { fontWeight: '600' },
  viewComments: { paddingHorizontal: spacing.md, paddingBottom: 8, fontSize: 13, color: colors.g400 },
});
