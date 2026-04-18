import React, { useEffect, useState } from 'react';
import { Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { messagesService, ConversationSummary } from '@/services/messagesService';
import { ConversationRow } from '@/components/ConversationRow';

export default function MessagesListScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    messagesService
      .listConversations()
      .then((cs) => {
        setConversations(cs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Text style={styles.title}>Messages</Text>
      <FlatList
        data={conversations}
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
  title: { fontSize: 22, fontWeight: '700', padding: 16 },
  empty: { textAlign: 'center', padding: 32, color: '#737373' },
});
