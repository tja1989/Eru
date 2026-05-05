import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exploreService } from '../../services/exploreService';
import { MediaGrid } from '../../components/MediaGrid';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../constants/theme';

type UserResult = {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  tier?: string;
  bio?: string | null;
};

const CATEGORIES = [
  { key: 'all', label: 'For You' },
  { key: 'food', label: '🍔 Food' },
  { key: 'travel', label: '✈️ Travel' },
  { key: 'tech', label: '💻 Tech' },
  { key: 'fitness', label: '💪 Fitness' },
  { key: 'film', label: '🎬 Film' },
  { key: 'art', label: '🎨 Art' },
  { key: 'local', label: '📍 Local' },
];

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExplore = useCallback(async (cat = category) => {
    try {
      const data = await exploreService.getExplore(cat);
      setItems(data.data ?? []);
      setUserResults([]); // user results only appear for text search, not category browse
    } catch {
      setItems([]);
      setUserResults([]);
    }
  }, [category]);

  // Fetch only when the tab is focused (not on app cold-boot). useFocusEffect
  // reruns when category changes IFF the screen is currently focused; if the
  // user changes category from a different tab somehow, the next focus reloads.
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadExplore(category).finally(() => setLoading(false));
    }, [category, loadExplore]),
  );

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await exploreService.search(query.trim());
      setItems(data.posts ?? []);
      // Users section only renders in the search state; category browse hides it.
      setUserResults((data.users ?? []) as UserResult[]);
    } catch {
      setItems([]);
      setUserResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExplore(category);
    setRefreshing(false);
  };

  const handleCategorySelect = (key: string) => {
    setCategory(key);
    setQuery('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts, people, hashtags..."
            placeholderTextColor={colors.g400}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); loadExplore(category); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillsScroll}
        contentContainerStyle={styles.pillsContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.pill, category === cat.key && styles.pillActive]}
            onPress={() => handleCategorySelect(cat.key)}
          >
            <Text style={[styles.pillText, category === cat.key && styles.pillTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Grid */}
      {loading && items.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          style={styles.gridScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.blue} />
          }
          showsVerticalScrollIndicator={false}
        >
          {userResults.length > 0 && (
            <View style={styles.peopleSection}>
              <Text style={styles.sectionHeader}>People</Text>
              {userResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  testID={`user-result-${u.id}`}
                  style={styles.userRow}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/users/[id]', params: { id: u.id } } as any)}
                >
                  {u.avatarUrl ? (
                    <Image source={{ uri: u.avatarUrl }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                      <Text style={styles.userAvatarInitial}>{(u.name || u.username || '?').slice(0, 1).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {u.name}
                      {u.isVerified ? ' ✓' : ''}
                    </Text>
                    <Text style={styles.userHandle} numberOfLines={1}>@{u.username}</Text>
                  </View>
                  <Text style={styles.userChevron}>›</Text>
                </TouchableOpacity>
              ))}
              {items.length > 0 ? <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Posts</Text> : null}
            </View>
          )}

          {items.length === 0 && userResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔭</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySubtitle}>Try a different category or search term</Text>
            </View>
          ) : items.length > 0 ? (
            <MediaGrid items={items} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  searchRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.g100,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: colors.g800 },
  clearBtn: { fontSize: 14, color: colors.g500, padding: spacing.xs },
  pillsScroll: { maxHeight: 48, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  pillsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.g300,
    backgroundColor: '#fff',
  },
  pillActive: {
    backgroundColor: colors.g900,
    borderColor: colors.g900,
  },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.g700 },
  pillTextActive: { color: '#fff' },
  gridScroll: { flex: 1 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.md,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.g800 },
  emptySubtitle: { fontSize: 14, color: colors.g500 },
  peopleSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.g700,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.g200 },
  userAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  userAvatarInitial: { fontSize: 18, fontWeight: '700', color: colors.g600 },
  userName: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  userHandle: { fontSize: 12, color: colors.g500, marginTop: 2 },
  userChevron: { fontSize: 22, color: colors.g400 },
});
