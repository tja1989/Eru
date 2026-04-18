import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

interface ThreadPart {
  id: string;
  text: string;
  threadPosition: number;
}

interface ThreadViewProps {
  parts: ThreadPart[];
}

export function ThreadView({ parts }: ThreadViewProps) {
  if (parts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No parts</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header showing total count */}
      <Text style={styles.header}>{parts.length} {parts.length === 1 ? 'part' : 'parts'}</Text>

      {parts.map((part, idx) => {
        const isLast = idx === parts.length - 1;
        return (
          <View key={part.id} style={styles.partWrapper}>
            <View style={styles.leftColumn}>
              {/* Position badge — shows 1-based position number */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{idx + 1}</Text>
              </View>
              {/* Vertical connector line between bubbles, except after last */}
              {!isLast && <View style={styles.connectorLine} />}
            </View>

            <View style={[styles.bubble, isLast && styles.bubbleLast]}>
              <Text style={styles.partText}>{part.text}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 0,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.g400,
  },
  header: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.g500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  partWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  leftColumn: {
    alignItems: 'center',
    width: 24,
    flexShrink: 0,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.g900,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: colors.g300,
    marginVertical: 2,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.g50,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bubbleLast: {
    marginBottom: 0,
  },
  partText: {
    fontSize: 14,
    color: colors.g800,
    lineHeight: 20,
  },
});
