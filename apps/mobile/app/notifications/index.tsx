import React, { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../../stores/notificationStore';
import { RelativeTime } from '../../components/RelativeTime';
import { userService } from '../../services/userService';
import { colors, spacing, radius } from '../../constants/theme';

// PWA 6 filter tabs. "all" is a wildcard; other keys match either Notification
// `type` directly or a family (posts = post_approved | post_declined | trending).
type Filter = 'all' | 'posts' | 'offers' | 'leaderboard' | 'messages' | 'activity';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'posts', label: 'Posts' },
  { key: 'offers', label: 'Offers' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'messages', label: 'Messages' },
  { key: 'activity', label: 'Activity' },
];

// Left-border accent + emoji per notification type — matches the PWA's
// colored chit strip that tells users what kind of note they're looking at.
const TYPE_META: Record<string, { color: string; emoji: string }> = {
  boost_proposal: { color: colors.orange, emoji: '🚀' },
  post_approved: { color: colors.green, emoji: '✓' },
  post_declined: { color: colors.red, emoji: '⚠️' },
  trending: { color: colors.orange, emoji: '🔥' },
  watchlist_offer: { color: colors.teal, emoji: '🏪' },
  leaderboard: { color: colors.gold, emoji: '👑' },
  follower: { color: colors.blue, emoji: '👥' },
  quest: { color: colors.purple, emoji: '🎯' },
  expiry: { color: colors.red, emoji: '⏰' },
  default: { color: colors.g300, emoji: '🔔' },
};

function filterMatch(type: string | undefined, f: Filter): boolean {
  if (f === 'all') return true;
  const t = type ?? 'default';
  if (f === 'posts') return ['post_approved', 'post_declined', 'trending'].includes(t);
  if (f === 'offers') return ['watchlist_offer', 'boost_proposal'].includes(t);
  if (f === 'leaderboard') return t === 'leaderboard';
  if (f === 'messages') return t === 'message';
  if (f === 'activity') return ['follower', 'quest', 'expiry'].includes(t);
  return false;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const items = useNotificationStore((s) => s.items);
  const loading = useNotificationStore((s) => s.loading);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refresh = useNotificationStore((s) => s.refresh);
  const loadMore = useNotificationStore((s) => s.loadMore);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Group into NEW (unread) and EARLIER (read). Within each, newest-first.
  const sections = useMemo(() => {
    const filtered = items.filter((n: any) => filterMatch(n.type, filter));
    const sortedDesc = [...filtered].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const unread = sortedDesc.filter((n: any) => !n.isRead);
    const read = sortedDesc.filter((n: any) => n.isRead);
    const s: { title: string; data: any[] }[] = [];
    if (unread.length) s.push({ title: 'NEW', data: unread });
    if (read.length) s.push({ title: 'EARLIER', data: read });
    return s;
  }, [items, filter]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.action}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 100 }} />
        )}
      </View>

      {/* 6 filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
      >
        {FILTERS.map((f) => {
          const selected = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              testID={`notif-tab-${f.key}`}
              accessibilityState={{ selected }}
              onPress={() => setFilter(f.key)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <SectionList
        sections={sections}
        keyExtractor={(n: any) => n.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }: { item: any }) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.default;
          return (
            <View style={[styles.row, !item.isRead && styles.unread, { borderLeftColor: meta.color }]}>
              <Text style={styles.rowEmoji}>{meta.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
                {item.createdAt ? (
                  <View style={styles.rowTime}>
                    <RelativeTime iso={item.createdAt} />
                  </View>
                ) : null}
                <NotificationCta item={item} router={router} />
              </View>
            </View>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color="#C7C7C7" />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

// Type-specific CTA row rendered under a notification. Each notification
// `type` maps to one action the user most wants to take next — the PWA's
// inline buttons (Follow back, Tap to accept, Redeem now, View post).
function NotificationCta({ item, router }: { item: any; router: any }) {
  const data = item.data ?? {};
  const deepLink: string | undefined = item.deepLink;

  async function followBack(userId: string) {
    try {
      await userService.follow(userId);
      Alert.alert('Followed', 'You are now following this person.');
    } catch (e: any) {
      Alert.alert('Could not follow', e?.response?.data?.error ?? 'Try again');
    }
  }

  switch (item.type) {
    case 'follower':
      if (!data.userId) return null;
      return (
        <TouchableOpacity
          onPress={() => followBack(data.userId)}
          style={[styles.ctaBtn, styles.ctaPrimary]}
          accessibilityLabel="Follow back"
        >
          <Text style={styles.ctaPrimaryText}>Follow back</Text>
        </TouchableOpacity>
      );
    case 'boost_proposal':
      return (
        <TouchableOpacity
          onPress={() => router.push(deepLink ?? '/sponsorship')}
          style={[styles.ctaBtn, styles.ctaAccent]}
          accessibilityLabel="Review proposal"
        >
          <Text style={styles.ctaAccentText}>Tap to accept →</Text>
        </TouchableOpacity>
      );
    case 'watchlist_offer':
      return (
        <TouchableOpacity
          onPress={() => router.push(deepLink ?? { pathname: '/redeem', params: { type: 'local' } })}
          style={[styles.ctaBtn, styles.ctaTeal]}
          accessibilityLabel="Redeem now"
        >
          <Text style={styles.ctaTealText}>Redeem now →</Text>
        </TouchableOpacity>
      );
    case 'post_approved':
    case 'trending':
      if (!data.contentId) return null;
      return (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/post/[id]', params: { id: data.contentId } })}
          style={[styles.ctaBtn, styles.ctaSecondary]}
          accessibilityLabel="View post"
        >
          <Text style={styles.ctaSecondaryText}>View post →</Text>
        </TouchableOpacity>
      );
    case 'post_declined':
      if (!data.contentId) return null;
      return (
        <TouchableOpacity
          onPress={() => router.push('/my-content')}
          style={[styles.ctaBtn, styles.ctaSecondary]}
          accessibilityLabel="See reason"
        >
          <Text style={styles.ctaSecondaryText}>See reason →</Text>
        </TouchableOpacity>
      );
    case 'leaderboard':
      return (
        <TouchableOpacity
          onPress={() => router.push('/leaderboard')}
          style={[styles.ctaBtn, styles.ctaSecondary]}
          accessibilityLabel="See ranks"
        >
          <Text style={styles.ctaSecondaryText}>See ranks →</Text>
        </TouchableOpacity>
      );
    case 'quest':
      return (
        <TouchableOpacity
          onPress={() => router.push('/leaderboard')}
          style={[styles.ctaBtn, styles.ctaSecondary]}
          accessibilityLabel="View quests"
        >
          <Text style={styles.ctaSecondaryText}>View quests →</Text>
        </TouchableOpacity>
      );
    case 'expiry':
      return (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/redeem', params: { type: 'all' } })}
          style={[styles.ctaBtn, styles.ctaAccent]}
          accessibilityLabel="Redeem before expiry"
        >
          <Text style={styles.ctaAccentText}>Redeem now →</Text>
        </TouchableOpacity>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
    justifyContent: 'space-between',
  },
  back: { fontSize: 22, color: colors.g800 },
  title: { fontSize: 16, fontWeight: '700', color: colors.g900 },
  action: { color: colors.blue, fontWeight: '600', fontSize: 12 },
  tabs: { paddingVertical: spacing.sm, flexGrow: 0, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.g300,
  },
  tabActive: { backgroundColor: colors.g800, borderColor: colors.g800 },
  tabText: { color: colors.g600, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 4,
    fontSize: 10,
    fontWeight: '800',
    color: colors.g500,
    letterSpacing: 1,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: '#FAFAFA',
    borderLeftWidth: 3,
  },
  unread: { backgroundColor: '#FAFAFF' },
  rowEmoji: { fontSize: 18, width: 22, textAlign: 'center' },
  rowTitle: { fontWeight: '700', color: colors.g800, fontSize: 13 },
  rowBody: { color: colors.g600, marginTop: 2, fontSize: 12, lineHeight: 17 },
  rowTime: { marginTop: 4 },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.g400, fontSize: 14 },
  ctaBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: 8,
  },
  ctaPrimary: { backgroundColor: colors.blue },
  ctaPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ctaAccent: { backgroundColor: colors.orange },
  ctaAccentText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ctaTeal: { backgroundColor: colors.teal },
  ctaTealText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ctaSecondary: { backgroundColor: colors.g100 },
  ctaSecondaryText: { color: colors.g700, fontSize: 12, fontWeight: '700' },
});
