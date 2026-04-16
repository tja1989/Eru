import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { exploreService } from '../../services/exploreService';
import { MediaGrid } from '../../components/MediaGrid';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { colors, spacing, radius } from '../../constants/theme';

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
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExplore = useCallback(async (cat = category) => {
    try {
      const data = await exploreService.getExplore(cat);
      setItems(data.items ?? data.posts ?? []);
    } catch {
      setItems([]);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    loadExplore(category).finally(() => setLoading(false));
  }, [category]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await exploreService.search(query.trim());
      setItems(data.items ?? data.posts ?? []);
    } catch {
      setItems([]);
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
    <SafeAreaView style={styles.safe}>
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
          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔭</Text>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptySubtitle}>Try a different category or search term</Text>
            </View>
          ) : (
            <MediaGrid items={items} />
          )}
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
});
