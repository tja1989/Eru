import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { PostCard } from '@/components/PostCard';
import type { BizCampaignType } from '@eru/shared';

interface DraftSlice {
  type: BizCampaignType;
  title: string;
  body: string;
  imageUrl: string;
}

interface BusinessSlice {
  name: string;
  avatarUrl: string | null;
}

interface Props {
  draft: DraftSlice;
  business: BusinessSlice;
}

// Maps a draft campaign onto the same Post shape the consumer feed uses,
// so the Review step shows the ad exactly as users will see it. The fields
// here match what PostCard reads from `post.*` — keep this list in sync if
// PostCard adds a field it requires.
function toPreviewPost(draft: DraftSlice, business: BusinessSlice) {
  const text = draft.body ? `${draft.title}\n\n${draft.body}` : draft.title;
  const media = draft.imageUrl ? [{ id: 'preview-media', type: 'image', url: draft.imageUrl }] : [];
  return {
    id: 'preview',
    type: 'post',
    subtype: 'promo',
    text,
    mediaUrl: draft.imageUrl || null,
    media,
    isSponsored: true,
    isLiked: false,
    isDisliked: false,
    isSaved: false,
    likes: 0,
    dislikes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString(),
    user: {
      id: 'preview-business',
      name: business.name,
      username: business.name.toLowerCase().replace(/\s+/g, '_'),
      avatarUrl: business.avatarUrl,
    },
    business: { id: 'preview-business', name: business.name, avatarUrl: business.avatarUrl },
  };
}

export function AdPreview({ draft, business }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Preview</Text>
      <View style={styles.frame}>
        <PostCard post={toPreviewPost(draft, business)} isActive={false} />
      </View>
      <Text style={styles.helper}>How this ad will appear in the feed.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { fontSize: 12, fontWeight: '600', color: colors.g600, textTransform: 'uppercase', letterSpacing: 0.5 },
  frame: { borderWidth: 1, borderColor: colors.g100, borderRadius: radius.md, overflow: 'hidden', backgroundColor: '#fff' },
  helper: { fontSize: 12, color: colors.g500, fontStyle: 'italic' },
});
