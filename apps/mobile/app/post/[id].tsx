import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { contentService } from '../../services/contentService';
import { colors, spacing } from '../../constants/theme';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [id]);

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
});
