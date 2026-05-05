// apps/mobile/app/(tabs)/profile.tsx
// IG-fidelity profile.
//
// Layout:
//   • Top bar: username (left, 18/700) · ⊕ + ☰ icons (right)
//   • Row 1: 86px avatar (left) · stats (Posts / Followers / Following)
//     each as a centered stack — stats are vertical, NOT in a divider row
//   • Display name (14/600) + bio (14/400) BELOW that row, left-aligned
//   • CTA row: "Edit Profile" + "Share Profile" (both g100 fill, equal)
//     plus a square overflow button (▼)
//   • Highlights row
//   • Tab bar: ⊞ Posts | ▶ Reels | 👤 Tagged — only THREE tabs in IG
//   • 3-column grid below
//
// Removed (per pure-IG spec):
//   • Tier/points/streak badges, Creator Score card, "Create" CTA, "My
//     Creations" + "Saved" tabs (Saved lives in Settings → Saved on IG).
//   • If you need to keep "My Creations" and "Saved" reachable, put them
//     in Settings — they're not tabs on profile.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import { MediaGrid } from '../../components/MediaGrid';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { HighlightsRow } from '../../components/HighlightsRow';
import { HighlightEditor } from '../../components/HighlightEditor';
import { HighlightViewer } from '../../components/HighlightViewer';
import { userService, type UserProfile } from '../../services/userService';
import { highlightsService, Highlight, HighlightItem } from '../../services/highlightsService';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../constants/theme';

const GRID_TABS = [
  { key: 'posts',  glyph: '⊞' },
  { key: 'reels',  glyph: '▶' },
  { key: 'tagged', glyph: '👤' },
] as const;

type GridTab = (typeof GRID_TABS)[number]['key'];
type Profile = UserProfile;

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [gridTab, setGridTab] = useState<GridTab>('posts');
  const [gridItems, setGridItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
      setProfile(null);
    }
  };

  const loadContent = async (tab: GridTab) => {
    if (!userId) return;
    setContentLoading(true);
    try {
      const data = await userService.getContent(userId, tab);
      setGridItems(data.content ?? []);
    } catch {
      setGridItems([]);
    } finally {
      setContentLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([loadProfile(), loadContent(gridTab)]).finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => { loadContent(gridTab); }, [gridTab]);

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
    setHighlightsKey((k) => k + 1);
  };

  if (loading) return <LoadingSpinner />;

  const rawUsername = profile?.username ?? user?.username ?? '';
  const username = rawUsername ? `@${rawUsername}` : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topUsername}>{username}</Text>
        <View style={styles.topIcons}>
          <TouchableOpacity onPress={() => router.push('/create' as any)} hitSlop={8}>
            <Text style={styles.topIcon}>＋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings' as any)} hitSlop={8}>
            <Text style={styles.topIcon}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.g500} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: avatar + stats */}
        <View style={styles.headerRow}>
          <Avatar uri={profile?.avatarUrl ?? null} size={86} />
          <View style={styles.stats}>
            <Stat n={profile?.postCount ?? 0} label="posts" />
            <Stat n={profile?.followerCount ?? 0} label="followers" />
            <Stat n={profile?.followingCount ?? 0} label="following" />
          </View>
        </View>

        {/* Display name + bio */}
        <View style={styles.bioBlock}>
          <Text style={styles.displayName}>{profile?.name ?? user?.name ?? ''}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>

        {/* CTA row */}
        <View style={styles.ctaRow}>
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={styles.ctaText}>Edit profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cta}>
            <Text style={styles.ctaText}>Share profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaIcon}>
            <Text style={styles.ctaIconText}>⌄</Text>
          </TouchableOpacity>
        </View>

        {/* Highlights */}
        <HighlightsRow
          key={highlightsKey}
          userId={userId}
          editable={true}
          onSelect={handleHighlightSelect}
          onAddNew={() => { setEditorHighlight(undefined); setEditorOpen(true); }}
        />

        {/* Tab bar */}
        <View style={styles.gridTabBar}>
          {GRID_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.gridTabBtn, gridTab === tab.key && styles.gridTabBtnActive]}
              onPress={() => setGridTab(tab.key)}
            >
              <Text style={[styles.gridTabIcon, gridTab !== tab.key && { color: colors.g400 }]}>
                {tab.glyph}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grid */}
        {contentLoading ? (
          <View style={styles.contentLoader}><LoadingSpinner /></View>
        ) : gridItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No Posts Yet</Text>
          </View>
        ) : (
          <MediaGrid items={gridItems} />
        )}
      </ScrollView>

      <HighlightEditor
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        existing={editorHighlight}
        onSaved={handleHighlightSaved}
      />
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

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n.toLocaleString()}</Text>
      <Text style={styles.statL}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topUsername: { fontSize: 18, fontWeight: '700', color: colors.g900 },
  topIcons: { flexDirection: 'row', gap: 18 },
  topIcon: { fontSize: 26, color: colors.g900, fontWeight: '300' },

  scroll: { flex: 1 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 28,
  },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statN: { fontSize: 17, fontWeight: '700', color: colors.g900 },
  statL: { fontSize: 13, color: colors.g800, marginTop: 1 },

  bioBlock: { paddingHorizontal: 16, paddingTop: 12 },
  displayName: { fontSize: 14, fontWeight: '600', color: colors.g900 },
  bio: { fontSize: 14, color: colors.g800, lineHeight: 19, marginTop: 2 },

  ctaRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 14 },
  cta: {
    flex: 1,
    backgroundColor: colors.g100,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  ctaText: { fontSize: 14, fontWeight: '600', color: colors.g900 },
  ctaIcon: {
    width: 34,
    backgroundColor: colors.g100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconText: { fontSize: 14, fontWeight: '700', color: colors.g900 },

  gridTabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.g200,
    marginTop: 8,
  },
  gridTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    marginTop: -StyleSheet.hairlineWidth,
  },
  gridTabBtnActive: { borderTopColor: colors.g900 },
  gridTabIcon: { fontSize: 22, color: colors.g900 },

  contentLoader: { height: 200, justifyContent: 'center', alignItems: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 28, fontWeight: '700', color: colors.g900 },
});
