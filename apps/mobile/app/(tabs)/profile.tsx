import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { TierBadge } from '../../components/TierBadge';
import { MediaGrid } from '../../components/MediaGrid';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { HighlightsRow } from '../../components/HighlightsRow';
import { HighlightEditor } from '../../components/HighlightEditor';
import { HighlightViewer } from '../../components/HighlightViewer';
import { CreatorScoreCard } from '../../components/CreatorScoreCard';
import { userService, type UserProfile } from '../../services/userService';
import { highlightsService, Highlight, HighlightItem } from '../../services/highlightsService';
import { useAuthStore } from '../../stores/authStore';
import { usePointsStore } from '../../stores/pointsStore';
import { colors, spacing, radius, tierColors } from '../../constants/theme';
import { getOrCreateWeeklySnapshot } from '../../utils/creatorScoreSnapshot';

const GRID_TABS = [
  { key: 'posts', icon: '⊞', label: 'Posts' },
  { key: 'reels', icon: '🎬', label: 'Reels' },
  { key: 'created', icon: '✨', label: 'Created' },
  { key: 'saved', icon: '🔖', label: 'Saved' },
  { key: 'tagged', icon: '👥', label: 'Tagged' },
] as const;

type GridTab = (typeof GRID_TABS)[number]['key'];

// Re-use the typed profile shape from userService so TypeScript
// knows creatorScore is number | null (not any).
type Profile = UserProfile;

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { balance, streak, tier: storeTier } = usePointsStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [gridTab, setGridTab] = useState<GridTab>('posts');
  const [gridItems, setGridItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // MVP: weekly score delta — swap for server-side snapshot table when DAU grows.
  const [scoreDelta, setScoreDelta] = useState<number | undefined>(undefined);

  // Highlights state
  const [highlightsKey, setHighlightsKey] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorHighlight, setEditorHighlight] = useState<Highlight | undefined>(undefined);
  const [viewerHighlight, setViewerHighlight] = useState<Highlight | null>(null);
  const [viewerItems, setViewerItems] = useState<HighlightItem[]>([]);

  const userId = user?.id ?? '';

  const loadProfile = async () => {
    if (!userId) return;
    try {
      const data = await userService.getProfile(userId);
      setProfile(data.user);
    } catch {
      // fall back to auth store snapshot
      if (user) {
        setProfile({
          id: user.id,
          name: user.name,
          username: user.username,
          tier: user.tier,
          currentBalance: user.currentBalance,
        });
      }
    }
  };

  const loadContent = async (tab: GridTab) => {
    if (!userId) return;
    setContentLoading(true);
    try {
      const data = await userService.getContent(userId, tab);
      setGridItems(data.items ?? data.posts ?? []);
    } catch {
      setGridItems([]);
    } finally {
      setContentLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProfile(), loadContent(gridTab)]).finally(() =>
      setLoading(false),
    );
  }, []);

  useEffect(() => {
    loadContent(gridTab);
  }, [gridTab]);

  // Compute weekly creator-score delta from local snapshot (MVP approach).
  // Replace with a server-side snapshot table when DAU grows.
  // Single derived value prevents the double-fire that occurred when both
  // profile?.creatorScore and user?.creatorScore were listed as separate deps.
  const currentScore = profile?.creatorScore ?? user?.creatorScore ?? 50;
  useEffect(() => {
    getOrCreateWeeklySnapshot(Number(currentScore)).then(setScoreDelta);
  }, [currentScore]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadContent(gridTab)]);
    setRefreshing(false);
  };

  const handleHighlightSelect = async (highlight: Highlight) => {
    try {
      const full = await highlightsService.getHighlight(highlight.id);
      setViewerItems(full.items ?? []);
      setViewerHighlight(highlight);
    } catch {
      setViewerItems([]);
      setViewerHighlight(highlight);
    }
  };

  const handleHighlightSaved = (_saved: Highlight | null) => {
    setEditorOpen(false);
    setHighlightsKey((k) => k + 1); // force HighlightsRow re-fetch
  };

  if (loading) return <LoadingSpinner />;

  const displayTier = profile?.tier ?? storeTier ?? 'explorer';
  const displayBalance = balance > 0 ? balance : (profile?.currentBalance ?? 0);
  const displayStreak = streak > 0 ? streak : (profile?.streak ?? 0);
  const ringColor = tierColors[displayTier] ?? colors.g400;

  return (
    <SafeAreaView style={styles.safe}>
      {/* App header */}
      <View style={styles.appHeader}>
        <Text style={styles.logo}>Eru</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity onPress={() => router.push('/my-content' as any)}>
            <Text style={styles.headerIcon}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/leaderboard' as any)}>
            <Text style={styles.headerIcon}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings' as any)}>
            <Text style={styles.headerIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.blue} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Profile section */}
        <View style={styles.profileSection}>
          {/* Avatar with tier ring */}
          <View style={[styles.avatarRing, { borderColor: ringColor }]}>
            <Avatar
              uri={profile?.avatarUrl ?? null}
              size={80}
              tier={displayTier}
            />
          </View>

          {/* Name + username */}
          <Text style={styles.displayName}>{profile?.name ?? user?.name ?? 'You'}</Text>
          <Text style={styles.username}>@{profile?.username ?? user?.username}</Text>

          {/* Bio */}
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : null}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {(profile?.postsCount ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {(profile?.followersCount ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {(profile?.followingCount ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          {/* Badges row */}
          <View style={styles.badgesRow}>
            <TierBadge tier={displayTier} />
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsBadgeText}>⭐ {displayBalance.toLocaleString()} pts</Text>
            </View>
            {displayStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>🔥 {displayStreak}d streak</Text>
              </View>
            )}
          </View>

          {/* Creator Score card */}
          <CreatorScoreCard
            score={Number(currentScore)}
            deltaThisWeek={scoreDelta}
          />

          {/* Edit / Create buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn}>
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push('/create' as any)}
            >
              <Text style={styles.createBtnText}>+ Create</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Highlights row */}
        <HighlightsRow
          key={highlightsKey}
          userId={userId}
          editable={true}
          onSelect={handleHighlightSelect}
          onAddNew={() => { setEditorHighlight(undefined); setEditorOpen(true); }}
        />

        {/* Grid tabs */}
        <View style={styles.gridTabBar}>
          {GRID_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.gridTabBtn, gridTab === tab.key && styles.gridTabBtnActive]}
              onPress={() => setGridTab(tab.key)}
            >
              <Text style={styles.gridTabIcon}>{tab.icon}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid content */}
        {contentLoading ? (
          <View style={styles.contentLoader}>
            <LoadingSpinner />
          </View>
        ) : gridItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No content here yet</Text>
          </View>
        ) : (
          <MediaGrid items={gridItems} />
        )}
      </ScrollView>

      {/* Highlight Editor modal */}
      <HighlightEditor
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        existing={editorHighlight}
        onSaved={handleHighlightSaved}
      />

      {/* Highlight Viewer modal */}
      {viewerHighlight && (
        <HighlightViewer
          visible={viewerHighlight !== null}
          onClose={() => setViewerHighlight(null)}
          highlight={viewerHighlight}
          items={viewerItems}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    color: colors.g800,
    fontFamily: 'Georgia',
  },
  headerIcons: { flexDirection: 'row', gap: spacing.lg },
  headerIcon: { fontSize: 22 },
  scroll: { flex: 1 },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatarRing: {
    borderWidth: 3,
    borderRadius: 56,
    padding: 3,
    marginBottom: spacing.md,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.g900,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: colors.g500,
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: 13,
    color: colors.g700,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 18, fontWeight: '800', color: colors.g900 },
  statLabel: { fontSize: 12, color: colors.g500, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: colors.g200 },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  pointsBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  pointsBadgeText: { fontSize: 11, fontWeight: '700', color: colors.green },
  streakBadge: {
    backgroundColor: 'rgba(232,121,43,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,121,43,0.3)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  streakBadgeText: { fontSize: 11, fontWeight: '700', color: colors.orange },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    paddingHorizontal: spacing.sm,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.g300,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  createBtn: {
    flex: 1,
    backgroundColor: colors.orange,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  gridTabBar: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: colors.g200,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g200,
  },
  gridTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gridTabBtnActive: { borderBottomColor: colors.g900 },
  gridTabIcon: { fontSize: 20 },
  contentLoader: { height: 200, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.g500 },
});
