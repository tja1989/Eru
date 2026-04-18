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

const POLL_INTERVAL_MS = 5000;

export default function ChatDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

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

  const onSend = async () => {
    if (!text.trim() || !id) return;
    const sent = await messagesService.send(id, text.trim());
    setText('');
    setMessages((prev) => [...prev, sent]);
    setCurrentUserId(sent.senderId);
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
