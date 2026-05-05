// apps/mobile/app/notifications/index.tsx — IG Activity / Notifications
//
// Layout: simple "← Notifications" header, "New" / "This week" / "This month"
// section headers, flat rows with circular avatar + inline text + right-side
// thumb (post) OR Follow button (follower).
//
// Removed vs prior:
//  - 6-tab filter rail (All / Posts / Offers / Leaderboard / Messages / Activity)
//  - Per-type emoji + colored left-border accent strip
//  - Multi-button CTA blocks ("Tap to accept", "Redeem now →")
//
// IG-style compresses each notification to ONE row with a single tap target.
// Per-type CTAs that were inline now route on row tap to the right destination.

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../../stores/notificationStore';
import { RelativeTime } from '../../components/RelativeTime';
import { userService } from '../../services/userService';
import { colors, spacing, radius } from '../../constants/theme';

// Time-bucket a notification's age — IG's standard New / This week / This month / Earlier.
function bucket(iso: string): 'New' | 'This week' | 'This month' | 'Earlier' {
  const ageMs = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ageMs < 2 * day) return 'New';
  if (ageMs < 7 * day) return 'This week';
  if (ageMs < 30 * day) return 'This month';
  return 'Earlier';
}

// Resolve a row's tap destination from notification type. Replaces the old
// inline CTA buttons — IG-style notifications only have one tap target.
function destinationFor(item: any): string | { pathname: string; params?: any } | null {
  const data = item.data ?? {};
  if (item.deepLink) return item.deepLink;
  switch (item.type) {
    case 'follower':
      return data.userId ? { pathname: '/users/[id]', params: { id: data.userId } } : null;
    case 'post_approved':
    case 'trending':
      return data.contentId ? { pathname: '/post/[id]', params: { id: data.contentId } } : null;
    case 'post_declined':
      return '/my-content';
    case 'boost_proposal':
      return '/sponsorship';
    case 'watchlist_offer':
    case 'expiry':
      return { pathname: '/redeem', params: { type: 'all' } };
    case 'leaderboard':
    case 'quest':
      return '/leaderboard';
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const items = useNotificationStore((s) => s.items);
  const loading = useNotificationStore((s) => s.loading);
  const refresh = useNotificationStore((s) => s.refresh);
  const loadMore = useNotificationStore((s) => s.loadMore);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sections = useMemo(() => {
    const sortedDesc = [...items].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const groups: Record<string, any[]> = { New: [], 'This week': [], 'This month': [], Earlier: [] };
    for (const n of sortedDesc) groups[bucket(n.createdAt)].push(n);
    return (['New', 'This week', 'This month', 'Earlier'] as const)
      .filter((k) => groups[k].length > 0)
      .map((k) => ({ title: k, data: groups[k] }));
  }, [items]);

  function handleRowPress(item: any) {
    // Mark as read happens server-side via notificationStore — we just navigate.
    const dest = destinationFor(item);
    if (!dest) return;
    if (typeof dest === 'string') router.push(dest as any);
    else router.push(dest as any);
  }

  async function handleFollowBack(userId: string) {
    try {
      await userService.follow(userId);
      Alert.alert('Followed');
    } catch (e: any) {
      Alert.alert('Could not follow', e?.response?.data?.error ?? 'Try again');
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Back">
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={markAllRead}>
          <Text style={styles.markRead}>✓</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(n: any) => n.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }: { item: any }) => {
          const data = item.data ?? {};
          const avatarUrl = data.actorAvatarUrl ?? data.userAvatarUrl;
          const thumbUrl = data.contentThumbnailUrl;
          const isFollowerRow = item.type === 'follower' && data.userId;

          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.6}
              onPress={() => handleRowPress(item)}
            >
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>{(data.actorName ?? 'E').slice(0, 1)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>
                  <Text style={styles.rowBold}>{item.title}</Text>
                  {item.body ? <Text style={styles.rowBody}>  {item.body}</Text> : null}
                  {item.createdAt ? <Text style={styles.rowTime}>  · </Text> : null}
                  {item.createdAt ? <RelativeTime iso={item.createdAt} /> : null}
                </Text>
              </View>

              {/* Right side: Follow button OR post thumbnail OR nothing */}
              {isFollowerRow ? (
                <TouchableOpacity
                  style={styles.followBtn}
                  onPress={() => handleFollowBack(data.userId)}
                  accessibilityLabel="Follow back"
                >
                  <Text style={styles.followBtnText}>Follow</Text>
                </TouchableOpacity>
              ) : thumbUrl ? (
                <Image source={{ uri: thumbUrl }} style={styles.thumb} />
              ) : null}
            </TouchableOpacity>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.g500} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Activity On Your Posts</Text>
            <Text style={styles.emptySub}>When someone likes or comments on one of your posts, you'll see it here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 44,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g200,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 26, color: colors.g900 },
  markRead: { fontSize: 18, color: colors.g900 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.g900, textAlign: 'left' },

  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    fontSize: 15,
    fontWeight: '700',
    color: colors.g900,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.g200 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: colors.g600 },
  rowText: { fontSize: 14, color: colors.g900, lineHeight: 19 },
  rowBold: { fontWeight: '700', color: colors.g900 },
  rowBody: { fontWeight: '400', color: colors.g900 },
  rowTime: { color: colors.g500 },
  thumb: { width: 44, height: 44, backgroundColor: colors.g100 },
  followBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
  },
  followBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl, gap: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.g900 },
  emptySub: { fontSize: 13, color: colors.g500, textAlign: 'center', lineHeight: 19 },
});
