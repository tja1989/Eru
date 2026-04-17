import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { contentService } from '../../services/contentService';
import { colors, spacing } from '../../constants/theme';

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; username: string; avatarUrl?: string | null };
  replies?: Comment[];
}

// Human-friendly relative time ("2d", "3h", "now") — Instagram-style terseness.
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return `${Math.floor(d / 30)}mo`;
}

function CommentRow({ comment }: { comment: Comment }) {
  const avatar = comment.user?.avatarUrl;
  return (
    <View style={styles.commentRow}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.commentAvatar} />
      ) : (
        <View style={[styles.commentAvatar, styles.commentAvatarPlaceholder]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.commentBody}>
          <Text style={styles.commentUsername}>{comment.user?.username} </Text>
          {comment.text}
        </Text>
        <View style={styles.commentMeta}>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
          {comment.replies && comment.replies.length > 0 ? (
            <Text style={styles.commentReplies}>
              — View {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          ) : null}
        </View>
      </View>
      <Text style={styles.commentHeart}>🤍</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const loadComments = useCallback(
    async (page: number) => {
      if (!id) return;
      setCommentsLoading(true);
      try {
        const r = await contentService.getComments(id, page);
        const list: Comment[] = r.comments ?? r.data ?? [];
        setComments((prev) => (page === 1 ? list : [...prev, ...list]));
        setCommentsTotal(r.total ?? list.length);
      } catch {
        // ignore — keep what we have
      } finally {
        setCommentsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id) {
      setError('No post id provided');
      setLoading(false);
      return;
    }
    contentService
      .getById(id)
      .then((r) => setPost(r.content ?? r))
      .catch((err) => {
        setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load post');
      })
      .finally(() => setLoading(false));

    loadComments(1);
  }, [id, loadComments]);

  const hasMoreComments = comments.length < commentsTotal;

  const handleLoadMore = () => {
    const next = commentsPage + 1;
    setCommentsPage(next);
    loadComments(next);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header with back arrow */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.g400} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : post ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <PostCard post={post} />

          {/* Comments thread */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsHeading}>
              Comments{commentsTotal > 0 ? ` (${commentsTotal})` : ''}
            </Text>

            {commentsLoading && comments.length === 0 ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator color={colors.g400} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyComments}>
                <Text style={styles.emptyCommentsIcon}>💬</Text>
                <Text style={styles.emptyCommentsText}>No comments yet.</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment.</Text>
              </View>
            ) : (
              <>
                {comments.map((c) => (
                  <CommentRow key={c.id} comment={c} />
                ))}
                {hasMoreComments ? (
                  <TouchableOpacity onPress={handleLoadMore} style={styles.loadMore}>
                    <Text style={styles.loadMoreText}>
                      {commentsLoading ? 'Loading…' : `Load ${commentsTotal - comments.length} more`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  backBtn: { padding: spacing.xs },
  backArrow: { fontSize: 22, color: colors.g800, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.g900 },
  headerSpacer: { width: 30 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  errorIcon: { fontSize: 40 },
  errorText: { fontSize: 14, color: colors.g500, textAlign: 'center' },

  commentsSection: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 8,
    borderTopColor: colors.g100,
  },
  commentsHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.g800,
    marginBottom: spacing.md,
  },
  commentsLoading: { paddingVertical: 30, alignItems: 'center' },
  emptyComments: { paddingVertical: 40, alignItems: 'center', gap: 6 },
  emptyCommentsIcon: { fontSize: 32, opacity: 0.4 },
  emptyCommentsText: { fontSize: 14, fontWeight: '600', color: colors.g700 },
  emptyCommentsSubtext: { fontSize: 12, color: colors.g400 },

  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.g100 },
  commentAvatarPlaceholder: { backgroundColor: colors.g100 },
  commentBody: { fontSize: 13, color: colors.g800, lineHeight: 18 },
  commentUsername: { fontWeight: '600' },
  commentMeta: { flexDirection: 'row', marginTop: 4, gap: 6 },
  commentTime: { fontSize: 11, color: colors.g400 },
  commentReplies: { fontSize: 11, color: colors.g500, fontWeight: '600' },
  commentHeart: { fontSize: 14, opacity: 0.5 },

  loadMore: { alignItems: 'center', paddingVertical: 14 },
  loadMoreText: { fontSize: 13, color: colors.g500, fontWeight: '600' },
});
