// apps/mobile/app/(tabs)/index.tsx
// IG-fidelity home feed.
//
// Header:
//   • "Eru" wordmark on the left (script italic — same role as IG's
//     Instagram wordmark; swap to an SVG later for true brand parity)
//   • Heart (notifications) + paper-plane (messages) on the right
// Stories row directly beneath the header.
// Feed below — pure PostCard list, hairline divider only between cards.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { StoryRow } from '../../components/StoryRow';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useFeed } from '../../hooks/useFeed';
import { usePointsStore } from '../../stores/pointsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { feedService } from '../../services/feedService';
import { colors } from '../../constants/theme';

export default function HomeFeedScreen() {
  const router = useRouter();
  const { posts, loading, refreshing, refresh, loadMore, loadFeed } = useFeed();
  const { refreshSummary, earn } = usePointsStore();
  const refreshNotifications = useNotificationStore((s) => s.refresh);
  const unreadNotifs = useNotificationStore((s: any) => s.unreadCount ?? 0);
  const [stories, setStories] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadFeed(1);
    refreshSummary();
    refreshNotifications();
    feedService.getStories().then((r) => setStories(r.stories || [])).catch(() => {});
    earn('daily_checkin');
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderHeader = () => (
    <>
      <View style={styles.appHeader}>
        <Text style={styles.logo}>Eru</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push('/notifications')} hitSlop={8}>
            <View>
              <Text style={styles.headerIcon}>♡</Text>
              {unreadNotifs > 0 ? <View style={styles.dot} /> : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/messages')} hitSlop={8}>
            <Text style={styles.headerIcon}>✈</Text>
          </TouchableOpacity>
        </View>
      </View>
      <StoryRow stories={stories} />
      <View style={styles.divider} />
    </>
  );

  if (loading && posts.length === 0) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={posts}
        renderItem={({ item, index }) => (
          <PostCard post={item} isActive={index === activeIndex} />
        )}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  // The "Eru" wordmark plays the role of Instagram's brand-script logo.
  // Replace with an SVG/image asset (assets/brand/eru-wordmark.svg) for
  // pixel-fidelity in production; the inline Georgia italic is a placeholder.
  logo: {
    fontSize: 28,
    fontWeight: '700',
    fontStyle: 'italic',
    color: colors.g900,
    fontFamily: 'Georgia',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  headerIcon: { fontSize: 26, color: colors.g900 },
  dot: {
    position: 'absolute',
    top: -1,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.g200 },
});
