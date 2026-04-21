import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { messagesService, Message } from '@/services/messagesService';
import { MessageBubble } from '@/components/MessageBubble';
import { ProposalContextCard } from '@/components/ProposalContextCard';
import { sponsorshipService, type Proposal } from '@/services/sponsorshipService';
import { useAuthStore } from '@/stores/authStore';
import { realtime } from '@/services/realtime';

// Fallback polling when the websocket is unavailable. Realtime is the
// primary transport; polling keeps the UI fresh if the connection drops.
const POLL_INTERVAL_MS = 15_000;

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; proposalId?: string }>();
  const id = params.id;
  const currentUserId = useAuthStore((s) => s.user?.id ?? '');
  const token = useAuthStore((s) => s.token);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);

  // If the chat was opened from a boost-proposal notification, fetch the
  // proposal so we can pin the context card at the top of the thread.
  useEffect(() => {
    if (!params.proposalId) return;
    let cancelled = false;
    sponsorshipService
      .getDashboard()
      .then((d) => {
        if (cancelled) return;
        const all = [...d.pending, ...d.active];
        const match = all.find((p) => p.id === params.proposalId);
        if (match) setProposal(match);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [params.proposalId]);

  const loadMessages = useCallback(async () => {
    if (!id) return;
    try {
      const msgs = await messagesService.listMessages(id);
      setMessages(msgs);
    } catch {
      // ignore polling errors; next tick will retry
    }
  }, [id]);

  useEffect(() => {
    loadMessages();
    const timer = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadMessages]);

  // Realtime — subscribe to "message:new" for this conversation. Append
  // immediately, dedupe by id so the echo from our own send doesn't
  // double-add (send handler already optimistically appends).
  useEffect(() => {
    if (!id || !token) return;
    let cancelled = false;

    const handler = (...args: unknown[]) => {
      const payload = args[0] as { conversationId?: string; message?: Message } | undefined;
      if (!payload || cancelled) return;
      if (payload.conversationId !== id) return;
      const msg = payload.message;
      if (!msg) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };

    realtime.connect(token).catch(() => {});
    realtime.on('message:new', handler);
    return () => {
      cancelled = true;
      realtime.off('message:new', handler);
    };
  }, [id, token]);

  const onSend = async () => {
    if (!text.trim() || !id) return;
    const sent = await messagesService.send(id, text.trim());
    setText('');
    setMessages((prev) => [...prev, sent]);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {proposal ? (
          <ProposalContextCard proposal={proposal} onUpdated={setProposal} />
        ) : null}
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} isMine={item.senderId === currentUserId} />
          )}
          contentContainerStyle={{ padding: 10 }}
        />
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            style={styles.input}
          />
          <TouchableOpacity testID="send-btn" onPress={onSend} style={styles.sendBtn}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  back: { fontSize: 24 },
  inputRow: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#eee',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  sendBtn: {
    backgroundColor: '#E8792B',
    borderRadius: 20,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700' },
});
