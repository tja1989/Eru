import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '@/services/messagesService';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function MessageBubble({ message, isMine }: MessageBubbleProps) {
  return (
    <View
      testID="bubble-wrapper"
      style={[
        styles.wrapper,
        { alignSelf: isMine ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View style={[styles.bubble, isMine ? styles.mine : styles.theirs]}>
        <Text style={[styles.text, isMine && styles.mineText]}>{message.text}</Text>
      </View>
      <Text style={[styles.time, { textAlign: isMine ? 'right' : 'left' }]}>
        {formatTime(message.createdAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: '78%',
    marginVertical: 4,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  mine: {
    backgroundColor: '#E8792B',
  },
  theirs: {
    backgroundColor: '#F0F0F0',
  },
  text: {
    fontSize: 15,
    color: '#262626',
  },
  mineText: {
    color: '#fff',
  },
  time: {
    fontSize: 10,
    color: '#8E8E8E',
    marginTop: 2,
    paddingHorizontal: 4,
  },
});
