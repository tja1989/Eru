import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ContentSubtype } from '@eru/shared';
import { colors, spacing, radius } from '../constants/theme';

type SubtypeMeta = { key: ContentSubtype; icon: string; title: string; subtitle: string };

export const SUBTYPES: SubtypeMeta[] = [
  { key: 'review', icon: '⭐', title: 'Review', subtitle: 'Rate a business or product' },
  { key: 'recommendation', icon: '💡', title: 'Recommendation', subtitle: 'Suggest a place or product' },
  { key: 'vlog', icon: '🎬', title: 'Vlog / Day-in-Life', subtitle: 'Behind-the-scenes, experience' },
  { key: 'photo_story', icon: '📸', title: 'Photo Story', subtitle: 'Visual carousel or album' },
  { key: 'tutorial', icon: '📖', title: 'Tutorial / How-to', subtitle: 'Step-by-step guide or lesson' },
  { key: 'comparison', icon: '🆚', title: 'Comparison', subtitle: 'A vs B side-by-side' },
  { key: 'unboxing', icon: '📦', title: 'Unboxing / First Try', subtitle: 'Trying something new' },
  { key: 'event_coverage', icon: '🎪', title: 'Event Coverage', subtitle: 'Festival, pop-up, opening' },
  { key: 'hot_take', icon: '🔥', title: 'Hot Take / Opinion', subtitle: 'Discussion starter, debate' },
  { key: 'meme', icon: '😂', title: 'Meme / Fun', subtitle: 'Humor, entertainment' },
  { key: 'recipe', icon: '🍳', title: 'Recipe', subtitle: 'Food recipe or cooking guide' },
  { key: 'local_guide', icon: '📍', title: 'Local Guide', subtitle: 'Hidden gems, neighbourhood walks' },
];

export const SUBTYPE_BANNER: Record<ContentSubtype, string> = {
  review:
    '⭐ Review selected: Tag a business with @name to earn 20% commission if they boost your content. Reviews get 3x more reach from local users.',
  local_guide:
    '📍 Local Guide selected: Hyper-local posts get 2x reach within your pincode.',
  recommendation:
    '💡 Recommendation selected: Reach 1.5x more nearby users interested in this category.',
  tutorial:
    '📖 Tutorial selected: Instructional content gets 1.3x reach with learners in your area.',
  event_coverage:
    '🎪 Event Coverage selected: Time-sensitive events get 1.3x reach during the event window.',
  recipe:
    '🍳 Recipe selected: Recipes get 1.2x reach among food-interested users.',
  vlog: '🎬 Vlog: Share a day in your life with your followers.',
  photo_story: '📸 Photo Story: A visual album tells the story.',
  comparison: '🆚 Comparison: Help others choose by showing A vs B.',
  unboxing: '📦 Unboxing: First-impression content for new arrivals.',
  hot_take: '🔥 Hot Take: Start a conversation with a bold opinion.',
  meme: '😂 Meme: Keep it light — humor posts reach your existing followers.',
};

type Props = {
  value: ContentSubtype | null;
  onChange: (s: ContentSubtype) => void;
};

export function ContentSubtypeSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLeft}>📋 What type of content?</Text>
        <Text style={styles.headerRight}>Shapes reach & earnings</Text>
      </View>

      <View style={styles.grid}>
        {SUBTYPES.map((s) => {
          const selected = value === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.card, selected && styles.cardSelected]}
              onPress={() => onChange(s.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${s.title}: ${s.subtitle}`}
              testID={`subtype-card-${s.key}`}
            >
              <View style={styles.cardIconRow}>
                <Text style={styles.cardIcon}>{s.icon}</Text>
                {selected && <Text style={styles.cardCheck}>✓</Text>}
              </View>
              <Text style={styles.cardTitle}>{s.title}</Text>
              <Text style={styles.cardSubtitle}>{s.subtitle}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value && (
        <View style={styles.banner} testID="subtype-banner">
          <Text style={styles.bannerText}>{SUBTYPE_BANNER[value]}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  headerLeft: { fontSize: 13, fontWeight: '700', color: colors.g800 },
  headerRight: { fontSize: 11, color: colors.g500 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
  },
  card: {
    width: '48.5%',
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    padding: spacing.sm,
    marginBottom: 6,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: colors.orange,
    backgroundColor: 'rgba(232,121,43,0.06)',
  },
  cardIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardIcon: { fontSize: 20 },
  cardCheck: {
    fontSize: 12,
    color: colors.orange,
    fontWeight: '900',
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.g900 },
  cardSubtitle: { fontSize: 11, color: colors.g500, marginTop: 2 },
  banner: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(13,148,136,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(13,148,136,0.18)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  bannerText: { fontSize: 11, color: colors.teal, lineHeight: 16 },
});
