import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FollowButton } from '../../components/FollowButton';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius, tierColors } from '../../constants/theme';
import type { UserProfile } from '@eru/shared';

// Public-facing profile for any user other than the viewer themselves.
// Reached from Explore → search → People results, or from tapping a
// username on a post / comment / reel.
export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const meId = useAuthStore((s) => s.user?.id);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    // Viewing your own id via /users/[id] — bounce to the dedicated self
    // profile tab so the user hits their own editable view, not the
    // read-only public shape.
    if (meId && id === meId) {
      router.replace('/(tabs)/profile' as any);
      return;
    }
    (async () => {
      try {
        const res = await userService.getProfile(id);
        setProfile(res.user);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Could not load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, meId, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.navy} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 16 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>😕</Text>
          <Text style={styles.emptyTitle}>{error || 'Profile not found'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ringColor = tierColors[profile.tier] ?? colors.g400;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Back">
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>@{profile.username}</Text>
        <View style={{ width: 16 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Avatar + tier ring */}
        <View style={[styles.avatarRing, { borderColor: ringColor }]}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(profile.name || profile.username).slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Identity block */}
        <Text style={styles.name}>
          {profile.name}
          {profile.isVerified ? ' ✓' : ''}
        </Text>
        <Text style={styles.handle}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.postCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.followerCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profile.followingCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Follow CTA */}
        <View style={styles.followWrap}>
          <FollowButton
            targetUserId={profile.id}
            initiallyFollowing={profile.isFollowing}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  backIcon: { fontSize: 16, color: colors.g800 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  body: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.g200 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: colors.g600 },
  name: { fontSize: 18, fontWeight: '800', color: colors.g800, marginTop: 4 },
  handle: { fontSize: 13, color: colors.g500, marginTop: 2 },
  bio: {
    fontSize: 13,
    color: colors.g700,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 19,
    maxWidth: 320,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.g200,
    backgroundColor: colors.g50,
  },
  statItem: { alignItems: 'center', paddingHorizontal: spacing.md, minWidth: 80 },
  statDivider: { width: 0.5, height: 28, backgroundColor: colors.g200 },
  statNumber: { fontSize: 16, fontWeight: '800', color: colors.g800 },
  statLabel: { fontSize: 11, color: colors.g500, marginTop: 2 },
  followWrap: { marginTop: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.g800, textAlign: 'center' },
});
