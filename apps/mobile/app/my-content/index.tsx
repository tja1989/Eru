import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { userService } from '../../services/userService';
import { contentService } from '../../services/contentService';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius } from '../../constants/theme';
import { MyContentStatsBar } from '../../components/MyContentStatsBar';
import { CreatorEarningsCard } from '../../components/CreatorEarningsCard';
import { CreatorScoreCard } from '../../components/CreatorScoreCard';
import { getOrCreateWeeklySnapshot } from '../../utils/creatorScoreSnapshot';
import type { UserContentItem, GetUserContentResponse } from '@eru/shared';

type StatusFilter = 'all' | 'published' | 'pending' | 'declined';

type ContentItem = UserContentItem & { title?: string };

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'published', label: 'Published' },
  { key: 'pending', label: 'Pending' },
  { key: 'declined', label: 'Declined' },
];

const STATUS_CONFIG: Record<string, { dot: string; label: string; textColor: string }> = {
  published: { dot: colors.green, label: 'Published', textColor: colors.green },
  pending: { dot: colors.gold, label: 'Pending Review', textColor: colors.gold },
  declined: { dot: colors.red, label: 'Declined', textColor: colors.red },
};

export default function MyContentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [filter, setFilter] = useState<StatusFilter>('all');
  const [allItems, setAllItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  // MVP: weekly score delta — swap for server-side snapshot table when DAU grows.
  const [scoreDelta, setScoreDelta] = useState<number | undefined>(undefined);

  const loadContent = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = (await userService.getContent(user.id, 'created')) as GetUserContentResponse;
      setAllItems((data.content ?? []) as ContentItem[]);
    } catch {
      setAllItems([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadContent().finally(() => setLoading(false));
  }, [loadContent]);

  useEffect(() => {
    const currentScore = Number(user?.creatorScore ?? 50);
    getOrCreateWeeklySnapshot(currentScore).then(setScoreDelta);
  }, [user?.creatorScore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  };

  const handleResubmit = async (item: ContentItem) => {
    Alert.alert(
      'Resubmit for Review',
      'This will send your content back to the moderation queue.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resubmit',
          onPress: async () => {
            setActionLoading(item.id);
            try {
              await contentService.resubmit(item.id);
              setAllItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, moderationStatus: 'pending' } : i)),
              );
            } catch {
              Alert.alert('Error', 'Could not resubmit. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const handleAppeal = async (item: ContentItem) => {
    Alert.alert(
      'Appeal Decision',
      'Submit an appeal to have your content reviewed by a senior moderator.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Appeal',
          onPress: async () => {
            setActionLoading(item.id);
            try {
              await contentService.appeal(item.id);
              Alert.alert('Appeal Submitted', 'Our team will review your appeal within 48 hours.');
            } catch {
              Alert.alert('Error', 'Could not submit appeal. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ],
    );
  };

  const filteredItems = filter === 'all'
    ? allItems
    : allItems.filter((item) => item.moderationStatus === filter);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Content</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Content</Text>
        <View style={styles.headerSpacer} />
      </View>

      <MyContentStatsBar />
      <CreatorEarningsCard />
      <CreatorScoreCard
        score={Number(user?.creatorScore ?? 50)}
        deltaThisWeek={scoreDelta}
      />

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => {
          const count = f.key === 'all'
            ? allItems.length
            : allItems.filter((i) => i.moderationStatus === f.key).length;

          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content list */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.navy} />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              No {filter === 'all' ? '' : filter + ' '}content yet
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const statusCfg = STATUS_CONFIG[item.moderationStatus] ?? STATUS_CONFIG.pending;
            const isDeclined = item.moderationStatus === 'declined';
            const isPublished = item.moderationStatus === 'published';
            const isActioning = actionLoading === item.id;

            return (
              <View key={item.id} style={styles.contentCard}>
                <View style={styles.cardTop}>
                  {/* Status dot + label */}
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
                    <Text style={[styles.statusLabel, { color: statusCfg.textColor }]}>
                      {statusCfg.label}
                    </Text>
                  </View>

                  {/* Type badge */}
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{item.type.toUpperCase()}</Text>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title ?? `${item.type} · ${formatDate(String(item.createdAt))}`}
                </Text>

                {/* Meta */}
                <Text style={styles.cardDate}>{formatDate(String(item.createdAt))}</Text>

                {/* Stats for published content */}
                {isPublished && (
                  <View style={styles.statsRow}>
                    <Text style={styles.statItem}>👁 {(item.viewCount ?? 0).toLocaleString()}</Text>
                    <Text style={styles.statItem}>❤️ {(item.likeCount ?? 0).toLocaleString()}</Text>
                    <Text style={styles.statItem}>💬 {(item.commentCount ?? 0).toLocaleString()}</Text>
                  </View>
                )}

                {/* Decline reason */}
                {isDeclined && item.declineReason ? (
                  <View style={styles.reasonBox}>
                    <Text style={styles.reasonLabel}>Reason:</Text>
                    <Text style={styles.reasonText}>{item.declineReason}</Text>
                  </View>
                ) : null}

                {/* Actions for declined content */}
                {isDeclined && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.resubmitBtn]}
                      onPress={() => handleResubmit(item)}
                      disabled={isActioning}
                    >
                      {isActioning ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.resubmitText}>Resubmit</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.appealBtn]}
                      onPress={() => handleAppeal(item)}
                      disabled={isActioning}
                    >
                      <Text style={styles.appealText}>Appeal</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
    backgroundColor: colors.card,
  },
  backBtn: { padding: spacing.xs },
  backArrow: { fontSize: 22, color: colors.g800, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.g900 },
  headerSpacer: { width: 30 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterScroll: { maxHeight: 52, backgroundColor: colors.card, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  filterContent: { paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.sm },
  filterPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.g100,
  },
  filterPillActive: { backgroundColor: colors.navy },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.g600 },
  filterTextActive: { color: '#fff' },

  scroll: { flex: 1 },

  contentCard: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.g100,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  typeBadge: {
    backgroundColor: colors.g100,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeText: { fontSize: 10, fontWeight: '700', color: colors.g500, letterSpacing: 0.5 },

  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.g900, lineHeight: 21, marginBottom: 4 },
  cardDate: { fontSize: 12, color: colors.g400, marginBottom: spacing.sm },

  statsRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  statItem: { fontSize: 13, color: colors.g600 },

  reasonBox: {
    backgroundColor: 'rgba(237,73,86,0.06)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(237,73,86,0.2)',
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: colors.red, marginBottom: 2 },
  reasonText: { fontSize: 13, color: colors.g700, lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resubmitBtn: { backgroundColor: colors.navy },
  resubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  appealBtn: {
    borderWidth: 1.5,
    borderColor: colors.g300,
    backgroundColor: 'transparent',
  },
  appealText: { fontSize: 14, fontWeight: '700', color: colors.g700 },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.g500 },
  bottomPad: { height: spacing.xxxl },
});
