import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  iso: string;
}

export function formatRelative(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d`;
  const diffW = Math.floor(diffD / 7);
  return `${diffW}w`;
}

export function RelativeTime({ iso }: Props) {
  return <Text style={styles.text}>{formatRelative(iso)}</Text>;
}

const styles = StyleSheet.create({
  text: { fontSize: 11, color: colors.g400 },
});
