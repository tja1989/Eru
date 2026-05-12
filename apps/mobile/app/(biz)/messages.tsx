import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { colors, spacing, radius } from '@/constants/theme';
import { messagesService, type ConversationSummary } from '@/services/messagesService';

// Biz-side messages tab. Owners see their inbox (the same Message rows the
// consumer side uses — there's only one model). Tap a conversation to open
// the existing /messages/[id] thread view, which already handles compose
// and read state. Keeping the thread renderer single-sourced means feature
// changes there light up for both audiences automatically.
export default function BizMessages() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    messagesService.listConversations()
      .then((res) => { setItems(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !items) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.g400} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Messages</Text>
      {(items?.length ?? 0) === 0 ? (
        <Text style={styles.empty}>No conversations yet. Start one from a creator's profile.</Text>
      ) : (items ?? []).map((c) => (
        <TouchableOpacity
          key={c.id}
          style={styles.row}
          onPress={() => router.push(`/messages/${c.id}` as Href)}
        >
          {c.otherUser?.avatarUrl ? (
            <Image source={{ uri: c.otherUser.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarLetter}>
                {(c.otherUser?.username ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.rowMain}>
            <Text style={styles.username}>@{c.otherUser?.username ?? 'unknown'}</Text>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {c.lastMessage?.text ?? 'No messages yet'}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  heading: { fontSize: 20, fontWeight: '700', color: colors.g800, marginBottom: spacing.sm },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.md },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.g100 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: colors.g600 },
  rowMain: { flex: 1, gap: 2 },
  username: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  lastMessage: { fontSize: 12, color: colors.g500 },
  chevron: { fontSize: 22, color: colors.g400 },

  empty: { fontSize: 13, color: colors.g400, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xl },
});
