import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '../stores/notificationStore';
import { colors } from '../constants/theme';

export function NotificationBell() {
  const router = useRouter();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const label = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <TouchableOpacity
      accessibilityLabel="Open notifications"
      onPress={() => router.push('/notifications')}
      style={styles.wrap}
    >
      <Text style={styles.icon}>🔔</Text>
      {unreadCount > 0 ? (
        <View accessibilityLabel={`unread count ${unreadCount}`} style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  icon: { fontSize: 22 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    borderRadius: 7,
    backgroundColor: colors.red,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
