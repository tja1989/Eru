import React, { useEffect, useMemo, useState } from 'react';
import { Text, FlatList, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { messagesService, ConversationSummary } from '@/services/messagesService';
import { ConversationRow } from '@/components/ConversationRow';
import { colors, spacing, radius } from '@/constants/theme';

type Filter = 'all' | 'business' | 'creators' | 'friends';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'business', label: 'Business' },
  { key: 'creators', label: 'Creators' },
  { key: 'friends', label: 'Friends' },
];

export default function MessagesListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    messagesService
      .listConversations()
      .then((cs) => {
        setConversations(cs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return conversations;
    if (filter === 'business') return conversations.filter((c: any) => c.otherUser?.kind === 'business');
    if (filter === 'creators') return conversations.filter((c: any) => c.otherUser?.isVerified === true);
    if (filter === 'friends') return conversations.filter((c: any) => c.otherUser?.isFollowing === true);
    return conversations;
  }, [conversations, filter]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Messages</Text>

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
              testID={`msg-tab-${f.key}`}
              accessibilityState={{ selected }}
              onPress={() => setFilter(f.key)}
              style={[styles.tab, selected && styles.tabActive]}
            >
              <Text style={[styles.tabText, selected && styles.tabTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => router.push(`/messages/${item.id}`)}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', padding: 16, color: colors.g900 },
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
  empty: { textAlign: 'center', padding: 32, color: colors.g500 },
});
