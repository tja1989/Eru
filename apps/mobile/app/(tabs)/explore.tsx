// apps/mobile/app/(tabs)/explore.tsx — IG-fidelity Search & Explore
//
// Two states:
// 1. RESTING (no query)        → minimal grey search bar + 3-col grid (no category pills)
// 2. SEARCHING (query present) → "People" results above a grid of matching posts
//
// Removed vs prior: emoji-prefixed category pills ("🍔 Food", "✈️ Travel"…).
// IG Explore is a flat grid; category browsing happens via tapping a hashtag,
// not a horizontal pill rail. If you need a Discover surface, build it as a
// separate screen, not on Explore.

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
  bio?: string | null;
};

export default function ExploreScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExplore = useCallback(async () => {
    try {
      const data = await exploreService.getExplore('all');
      setItems(data.data ?? []);
      setUserResults([]);
    } catch {
      setItems([]);
      setUserResults([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadExplore().finally(() => setLoading(false));
    }, [loadExplore]),
  );

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await exploreService.search(query.trim());
      setItems(data.posts ?? []);
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
    await loadExplore();
    setRefreshing(false);
  };

  const isSearching = query.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* IG search bar — flat grey pill, magnifier glyph, no border */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.g500}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); loadExplore(); }}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && items.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <ScrollView
          style={styles.gridScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.g600} />
          }
          showsVerticalScrollIndicator={false}
        >
          {isSearching && userResults.length > 0 && (
            <View style={styles.peopleSection}>
              {userResults.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  testID={`user-result-${u.id}`}
                  style={styles.userRow}
                  activeOpacity={0.6}
                  onPress={() => router.push({ pathname: '/users/[id]', params: { id: u.id } } as any)}
                >
                  {u.avatarUrl ? (
                    <Image source={{ uri: u.avatarUrl }} style={styles.userAvatar} />
                  ) : (
                    <View style={[styles.userAvatar, styles.userAvatarFallback]}>
                      <Text style={styles.userAvatarInitial}>
                        {(u.name || u.username || '?').slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userHandle} numberOfLines={1}>
                      {u.username}
                      {u.isVerified ? '  ✓' : ''}
                    </Text>
                    <Text style={styles.userName} numberOfLines={1}>{u.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {items.length === 0 && userResults.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySubtitle}>Try a different search</Text>
            </View>
          ) : items.length > 0 ? (
            // 3-column grid, 1px gutters — IG Explore standard
            <MediaGrid items={items} />
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  searchRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.g100,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 14, opacity: 0.5 },
  searchInput: { flex: 1, fontSize: 14, color: colors.g900 },
  clearBtn: { fontSize: 13, color: colors.g500, padding: 2 },
  gridScroll: { flex: 1 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: spacing.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.g900 },
  emptySubtitle: { fontSize: 13, color: colors.g500 },
  peopleSection: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.g200 },
  userAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  userAvatarInitial: { fontSize: 18, fontWeight: '700', color: colors.g600 },
  userHandle: { fontSize: 14, fontWeight: '600', color: colors.g900 },
  userName: { fontSize: 13, color: colors.g500, marginTop: 1 },
});
