import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { RelativeTime } from './RelativeTime';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  verified?: boolean;
}

// Nested under a parent comment on the post-detail screen to make business
// replies visually distinct from regular user replies — the orange tint +
// verified checkmark matches the PWA's storefront-reply treatment.
export function BusinessReplyCard({ text, createdAt, user, verified }: Props) {
  return (
    <View style={styles.row}>
      <Avatar uri={user.avatarUrl} size={26} />
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.username}>{user.username}</Text>
          {verified ? <Text style={styles.verified}>✓</Text> : null}
          <View style={styles.timeWrap}>
            <RelativeTime iso={createdAt} />
          </View>
        </View>
        <Text style={styles.body}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingLeft: 30, paddingRight: spacing.md, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: 'rgba(232,121,43,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,121,43,0.2)',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  username: { fontSize: 12, fontWeight: '700', color: colors.orange },
  verified: { fontSize: 10, color: colors.orange, fontWeight: '800' },
  timeWrap: { marginLeft: 'auto' },
  body: { fontSize: 12, color: colors.g800, lineHeight: 17 },
});
