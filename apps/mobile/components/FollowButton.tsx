// apps/mobile/components/FollowButton.tsx
// IG-fidelity Follow button.
//   • Not following → solid IG-blue background, white text, "Follow"
//   • Following     → light gray fill (g100), black text, "Following"
//   • Both states use 8px radius (IG uses ~6–8px on rectangular buttons)

import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { userService } from '@/services/userService';
import { colors } from '@/constants/theme';

type Props = {
  targetUserId: string;
  initiallyFollowing: boolean;
  onChange?: (nowFollowing: boolean) => void;
  size?: 'sm' | 'md';
};

export function FollowButton({ targetUserId, initiallyFollowing, onChange, size = 'md' }: Props) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);

  async function handlePress() {
    if (busy) return;
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) await userService.follow(targetUserId);
      else await userService.unfollow(targetUserId);
      onChange?.(next);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  const isSm = size === 'sm';
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={busy}
      style={[
        styles.base,
        isSm && styles.sm,
        following ? styles.outlined : styles.filled,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={following ? colors.g800 : '#fff'} />
      ) : (
        <Text style={[styles.text, following ? styles.textOutlined : styles.textFilled]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
  },
  sm: { paddingHorizontal: 12, paddingVertical: 5, minWidth: 76, borderRadius: 6 },
  filled: { backgroundColor: colors.blue },
  outlined: { backgroundColor: colors.g100 },
  text: { fontWeight: '600', fontSize: 14 },
  textFilled: { color: '#fff' },
  textOutlined: { color: colors.g800 },
});
