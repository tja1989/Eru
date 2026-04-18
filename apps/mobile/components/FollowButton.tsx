import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { userService } from '@/services/userService';

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
    const nextFollowing = !following;
    setFollowing(nextFollowing);
    setBusy(true);
    try {
      if (nextFollowing) {
        await userService.follow(targetUserId);
      } else {
        await userService.unfollow(targetUserId);
      }
      onChange?.(nextFollowing);
    } catch {
      setFollowing(!nextFollowing);
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
        <ActivityIndicator size="small" color={following ? '#1A3C6E' : '#fff'} />
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  sm: { paddingHorizontal: 10, paddingVertical: 5, minWidth: 70 },
  filled: { backgroundColor: '#1A3C6E' },
  outlined: { borderWidth: 1, borderColor: '#1A3C6E', backgroundColor: 'transparent' },
  text: { fontWeight: '700', fontSize: 13 },
  textFilled: { color: '#fff' },
  textOutlined: { color: '#1A3C6E' },
});
