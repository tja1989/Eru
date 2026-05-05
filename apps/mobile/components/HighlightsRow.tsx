// apps/mobile/components/HighlightsRow.tsx
// IG-fidelity highlights — gray circle with a thin g200 border, NO emoji
// inside (IG shows a cropped image; we render a clean monogram fallback).
// Title is centered below in g800 12px.

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
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
      {editable && (
        <TouchableOpacity style={styles.item} onPress={onAddNew}>
          <View style={[styles.circle, styles.addCircle]}>
            <Text style={styles.addIcon}>+</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>New</Text>
        </TouchableOpacity>
      )}

      {highlights.map((h: any) => (
        <TouchableOpacity
          key={h.id}
          testID={`highlight-${h.id}`}
          style={styles.item}
          onPress={() => onSelect(h)}
        >
          <View style={styles.circle}>
            {h.coverUrl ? (
              <Image source={{ uri: h.coverUrl }} style={styles.cover} />
            ) : (
              <Text style={styles.monogram}>
                {(h.title?.[0] ?? '·').toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>{h.title}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const CIRCLE = 64;

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card },
  content: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.lg,
  },
  item: { alignItems: 'center', width: CIRCLE + 8 },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: colors.g50,
    borderWidth: 1,
    borderColor: colors.g200,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cover: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2 },
  addCircle: { borderStyle: 'dashed', borderColor: colors.g300, backgroundColor: '#fff' },
  addIcon: { fontSize: 26, color: colors.g600, fontWeight: '300' },
  monogram: { fontSize: 22, color: colors.g500, fontWeight: '500' },
  title: {
    fontSize: 12,
    color: colors.g800,
    marginTop: 6,
    maxWidth: CIRCLE + 8,
    textAlign: 'center',
  },
});
