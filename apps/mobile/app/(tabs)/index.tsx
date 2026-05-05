import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PostCard } from '../../components/PostCard';
import { StoryRow } from '../../components/StoryRow';
import { PointsBadge } from '../../components/PointsBadge';
import { NotificationBell } from '../../components/NotificationBell';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useFeed } from '../../hooks/useFeed';
import { usePointsStore } from '../../stores/pointsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { feedService } from '../../services/feedService';
import { useThemedStyles } from '../../constants/theme';
import type { ThemeColors } from '../../constants/theme';

// Style factory hoisted outside the component so its reference is stable
// across renders — useThemedStyles' useMemo hits, no per-render
// StyleSheet.create. This is the canonical migration pattern; other
// screens in PR-A.2 through PR-A.4 follow the same shape.
const stylesFactory = (c: ThemeColors) => ({
  safe: { flex: 1 as const, backgroundColor: c.bg },
  appHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: c.card,
    borderBottomWidth: 0.5,
    borderBottomColor: c.g100,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800' as const,
    fontStyle: 'italic' as const,
    color: c.g800,
    fontFamily: 'Georgia',
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
});

export default function HomeFeedScreen() {
  const router = useRouter();
  const { posts, loading, refreshing, refresh, loadMore, loadFeed } = useFeed();
  const { refreshSummary, earn } = usePointsStore();
  const refreshNotifications = useNotificationStore((s) => s.refresh);
  const styles = useThemedStyles(stylesFactory);
  const [stories, setStories] = useState<any[]>([]);
  // Index of the post currently most in view — only that post's video plays.
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    loadFeed(1);
    refreshSummary();
    refreshNotifications();
    feedService.getStories().then((r) => setStories(r.stories || [])).catch(() => {});
    earn('daily_checkin');
  }, []);

  // When the user scrolls, switch the active video to whichever post is
  // most visible. 60% threshold matches Instagram's feel.
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
          <PointsBadge />
          <NotificationBell />
          <TouchableOpacity onPress={() => router.push('/messages')} accessibilityLabel="Open messages">
            <Text style={{ fontSize: 22 }}>✉️</Text>
          </TouchableOpacity>
        </View>
      </View>
      <StoryRow stories={stories} />
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

