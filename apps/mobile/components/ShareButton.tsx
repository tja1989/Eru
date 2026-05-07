import React from 'react';
import { Share, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePointsStore } from '../stores/pointsStore';
import { formatHandle } from '../utils/formatHandle';

interface ShareButtonProps {
  contentId: string;
  creatorUsername: string;
  caption?: string;
  // Optional extras so callers can add layout affordances (e.g. reels needs a
  // "Share" label under the icon and a different touch style).
  style?: any;
  iconStyle?: any;
  label?: string;
  labelStyle?: any;
  onShared?: () => void;
}

/**
 * Opens the OS native share sheet with a deep link back to the post and
 * awards share points only when the user actually completes the share
 * (Share.sharedAction). Dismissal/errors never earn points.
 */
export function ShareButton({
  contentId,
  creatorUsername,
  caption,
  style,
  iconStyle,
  label,
  labelStyle,
  onShared,
}: ShareButtonProps) {
  const handlePress = async () => {
    const url = `https://eru.app/post/${contentId}`;
    const handle = formatHandle(creatorUsername) || '@unknown';
    const message = `${handle} on Eru: ${caption ?? ''}\n${url}`;
    try {
      const result = await Share.share({ url, message });
      if (result.action === Share.sharedAction) {
        usePointsStore.getState().earn('share', contentId);
        onShared?.();
      }
    } catch {
      // Swallow — errors never award points, and we don't want to crash the UI.
    }
  };

  return (
    <TouchableOpacity
      testID="share-button"
      onPress={handlePress}
      style={style}
      accessibilityRole="button"
      accessibilityLabel="Share"
    >
      {/* IG-style paper-plane share glyph. Sized by iconStyle?.fontSize when
          callers want a larger glyph (Reels uses 32). */}
      <Ionicons
        name="paper-plane-outline"
        size={iconStyle?.fontSize ?? 26}
        color={iconStyle?.color ?? '#262626'}
      />
      {label ? <Text style={labelStyle}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 26 },
});
