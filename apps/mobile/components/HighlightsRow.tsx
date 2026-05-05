import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { highlightsService, Highlight } from '@/services/highlightsService';
import { colors, spacing } from '@/constants/theme';

interface Props {
  userId: string;
  onSelect: (highlight: Highlight) => void;
  onAddNew?: () => void;
  editable?: boolean;
}

export function HighlightsRow({ userId, onSelect, onAddNew, editable = false }: Props) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => {
    highlightsService.listForUser(userId).then(setHighlights).catch(() => {});
  }, [userId]);

  if (highlights.length === 0 && !editable) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {highlights.map((h) => (
        <TouchableOpacity
          key={h.id}
          testID={`highlight-${h.id}`}
          style={styles.item}
          onPress={() => onSelect(h)}
        >
          <View style={styles.circle}>
            <Text style={styles.emoji}>{h.emoji}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{h.title}</Text>
        </TouchableOpacity>
      ))}

      {editable && (
        <TouchableOpacity style={styles.item} onPress={onAddNew}>
          <View style={[styles.circle, styles.addCircle]}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.title}>+ New</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const CIRCLE_SIZE = 68;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  item: {
    alignItems: 'center',
    width: CIRCLE_SIZE + 8,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.g100,
    borderWidth: 2,
    borderColor: colors.g200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    borderStyle: 'dashed',
    borderColor: colors.g400,
    backgroundColor: colors.bg,
  },
  emoji: {
    fontSize: 28,
  },
  addIcon: {
    fontSize: 24,
    color: colors.g500,
    fontWeight: '300',
  },
  title: {
    fontSize: 10.5,
    color: colors.g800,
    marginTop: 4,
    maxWidth: CIRCLE_SIZE + 8,
    textAlign: 'center',
  },
});
