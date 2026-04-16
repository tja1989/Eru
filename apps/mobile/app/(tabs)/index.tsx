import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PostCard } from '../../components/PostCard';
import { StoryRow } from '../../components/StoryRow';
import { PointsBadge } from '../../components/PointsBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useFeed } from '../../hooks/useFeed';
import { usePointsStore } from '../../stores/pointsStore';
import { feedService } from '../../services/feedService';
import { colors } from '../../constants/theme';

export default function HomeFeedScreen() {
  const { posts, loading, refreshing, refresh, loadMore, loadFeed } = useFeed();
  const { refreshSummary, earn } = usePointsStore();
  const [stories, setStories] = useState<any[]>([]);

  useEffect(() => {
    loadFeed(1);
    refreshSummary();
    feedService.getStories().then((r) => setStories(r.stories || [])).catch(() => {});
    earn('daily_checkin');
  }, []);

  const renderHeader = () => (
    <>
      <View style={styles.appHeader}>
        <Text style={styles.logo}>Eru</Text>
        <View style={styles.headerActions}>
          <PointsBadge />
          <Text style={{ fontSize: 24 }}>💬</Text>
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
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        onRefresh={refresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  appHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  logo: { fontSize: 26, fontWeight: '800', fontStyle: 'italic', color: colors.g800, fontFamily: 'Georgia' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
