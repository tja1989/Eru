import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Alert } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizFeedbackItem, BizFeedbackResponse } from '@eru/shared';

type SentimentTab = 'all' | 'positive' | 'neutral' | 'negative';
const TABS: { key: SentimentTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'positive', label: 'Positive' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'negative', label: 'Negative' },
];

function sentimentColor(s: BizFeedbackItem['sentiment']): string {
  switch (s) {
    case 'positive': return colors.green;
    case 'negative': return colors.red;
    case 'neutral':
    default: return colors.g500;
  }
}

function FeedbackRow({ item, onReply }: { item: BizFeedbackItem; onReply: (text: string) => Promise<void> }) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await onReply(draft.trim());
      setDraft('');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.rowHeader}>
        <Text style={styles.author}>@{item.authorUsername}</Text>
        <View style={[styles.dot, { backgroundColor: sentimentColor(item.sentiment) }]} />
        <Text style={[styles.sentimentLabel, { color: sentimentColor(item.sentiment) }]}>{item.sentiment}</Text>
      </View>
      <Text style={styles.body}>{item.text}</Text>

      {item.reply ? (
        <View style={styles.reply}>
          <Text style={styles.replyLabel}>Owner reply</Text>
          <Text style={styles.replyText}>{item.reply.text}</Text>
        </View>
      ) : (
        <View style={styles.replyForm}>
          <TextInput
            testID={`reply-input-${item.contentId}`}
            value={draft}
            onChangeText={setDraft}
            placeholder="Reply to this feedback…"
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.btnPrimary, (!draft.trim() || sending) && styles.btnDisabled]}
            onPress={send}
            disabled={!draft.trim() || sending}
          >
            <Text style={styles.btnPrimaryText}>{sending ? 'Sending…' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function BizFeedback() {
  const [tab, setTab] = useState<SentimentTab>('all');
  const [data, setData] = useState<BizFeedbackResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const filter = tab === 'all' ? undefined : tab;
    bizService.getFeedback(filter)
      .then((res) => { setData(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function onReply(contentId: string, text: string) {
    try {
      await bizService.replyFeedback(contentId, text);
      load();
    } catch (err) {
      Alert.alert('Reply failed', err instanceof Error ? err.message : 'Try again later');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !data ? (
        <View style={styles.center} testID="biz-feedback-loading">
          <ActivityIndicator size="large" color={colors.g400} />
        </View>
      ) : (data?.items.length ?? 0) === 0 ? (
        <View style={styles.center}><Text style={styles.empty}>No feedback yet</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {data!.items.map((item) => (
            <FeedbackRow
              key={item.contentId}
              item={item}
              onReply={(text) => onReply(item.contentId, text)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.g200 },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.g100 },
  tabActive: { backgroundColor: colors.blue },
  tabText: { fontSize: 12, fontWeight: '600', color: colors.g600 },
  tabTextActive: { color: '#fff' },

  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { fontSize: 13, fontWeight: '700', color: colors.g800, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sentimentLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  body: { fontSize: 14, color: colors.g700 },

  reply: { borderLeftWidth: 3, borderLeftColor: colors.blue, paddingLeft: spacing.md, marginTop: spacing.sm },
  replyLabel: { fontSize: 10, fontWeight: '700', color: colors.blue, textTransform: 'uppercase' },
  replyText: { fontSize: 13, color: colors.g700, marginTop: 2 },

  replyForm: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 13, backgroundColor: '#fff' },
  btnPrimary: { backgroundColor: colors.blue, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm },
  btnPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  empty: { fontSize: 14, color: colors.g400, fontStyle: 'italic' },
});
