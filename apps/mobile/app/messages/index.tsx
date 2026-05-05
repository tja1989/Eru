// apps/mobile/app/messages/index.tsx — IG Direct inbox
//
// Header: "← username    ✏️"  (back arrow, owner handle as title, "new message" pencil)
// Search box (grey pill, "Ask Meta AI or search" → "Search")
// Optional "Requests" row (count badge)
// Conversation list — flat rows, no filter pills
//
// Removed: All / Business / Creators / Friends pill bar. IG inbox doesn't filter.
// If filtering is genuinely needed, surface it under a "..." menu — not as
// always-visible chrome.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { messagesService, ConversationSummary } from '@/services/messagesService';
import { ConversationRow } from '@/components/ConversationRow';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, radius } from '@/constants/theme';

export default function MessagesListScreen() {
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    messagesService
      .listConversations()
      .then((cs) => {
        setConversations(cs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = query
    ? conversations.filter((c: any) => {
        const u = c.otherUser;
        const text = `${u?.username ?? ''} ${u?.name ?? ''}`.toLowerCase();
        return text.includes(query.toLowerCase());
      })
    : conversations;

  const requestCount = (conversations as any[]).filter((c) => c.isRequest).length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* IG header: back arrow + owner handle as title + new-message pencil */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{me?.username ?? 'Messages'}</Text>
        <TouchableOpacity style={styles.headerBtn} accessibilityLabel="New message">
          <Text style={styles.newMessage}>✏️</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={colors.g500}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.g500} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={
            requestCount > 0 ? (
              <TouchableOpacity style={styles.requestsRow} accessibilityLabel="Message requests">
                <View style={styles.requestsIcon}>
                  <Text style={{ fontSize: 18 }}>✉️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.requestsTitle}>Requests</Text>
                  <Text style={styles.requestsSub}>{requestCount} new</Text>
                </View>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              onPress={() => router.push(`/messages/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Your messages</Text>
              <Text style={styles.emptySub}>Send a message to start a chat.</Text>
            </View>
          }
        />
      )}
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
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  back: { fontSize: 26, color: colors.g900 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.g900 },
  newMessage: { fontSize: 20 },
  searchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
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
  requestsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  requestsIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.g100,
    alignItems: 'center', justifyContent: 'center',
  },
  requestsTitle: { fontSize: 14, fontWeight: '600', color: colors.g900 },
  requestsSub: { fontSize: 12, color: colors.blue, marginTop: 2, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: colors.g900 },
  emptySub: { fontSize: 14, color: colors.g500, marginTop: 8 },
});
