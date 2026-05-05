import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import type { ConversationSummary } from '@/services/messagesService';

interface ConversationRowProps {
  conversation: ConversationSummary;
  onPress: () => void;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export function ConversationRow({ conversation, onPress }: ConversationRowProps) {
  const { otherUser, lastMessage, lastMessageAt } = conversation;
  const username = otherUser?.username ?? 'Unknown';
  const preview = lastMessage?.text ?? '';
  // MVP unread heuristic: last message came from otherUser and has no readAt.
  const isUnread =
    !!lastMessage &&
    !lastMessage.readAt &&
    otherUser != null &&
    lastMessage.senderId === otherUser.id;

  const hasProposal = (conversation as any).proposalId != null;

  return (
    <TouchableOpacity onPress={onPress} style={styles.row} accessibilityRole="button">
      <Avatar uri={otherUser?.avatarUrl ?? null} size={48} />
      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
          {hasProposal ? (
            <View style={styles.boostPill}>
              <Text style={styles.boostPillText}>BOOST PROPOSAL</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.preview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{timeAgo(lastMessageAt)}</Text>
        {isUnread ? <View testID="unread-dot" style={styles.unreadDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  middle: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 15, fontWeight: '700', color: '#262626' },
  boostPill: { backgroundColor: '#E8792B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  boostPillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  preview: { fontSize: 13, color: '#737373', marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { fontSize: 12, color: '#737373' },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E8792B',
  },
});
