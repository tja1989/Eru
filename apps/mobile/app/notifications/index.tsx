import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../../stores/notificationStore';

export default function NotificationsScreen() {
  const router = useRouter();
  const items = useNotificationStore((s) => s.items);
  const loading = useNotificationStore((s) => s.loading);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refresh = useNotificationStore((s) => s.refresh);
  const loadMore = useNotificationStore((s) => s.loadMore);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.action}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 100 }} />
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <View style={[styles.row, !item.isRead && styles.unread]}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowBody}>{item.body}</Text>
          </View>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    justifyContent: 'space-between',
  },
  back: { fontSize: 24, color: '#262626' },
  title: { fontSize: 18, fontWeight: '700', color: '#262626' },
  action: { color: '#0095F6', fontWeight: '600' },
  row: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#FAFAFA' },
  unread: { backgroundColor: '#FAFAFF' },
  rowTitle: { fontWeight: '700', color: '#262626' },
  rowBody: { color: '#737373', marginTop: 4 },
  empty: { alignItems: 'center', padding: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#8E8E8E', fontSize: 16 },
});
