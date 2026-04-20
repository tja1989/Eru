import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { leaderboardService } from '../../services/leaderboardService';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius, tierColors } from '../../constants/theme';
import { WeeklyQuestsCard } from '@/components/WeeklyQuestsCard';
import { LeaderboardPodium } from '@/components/LeaderboardPodium';
import { LeaderboardScopeTabs, type Scope } from '@/components/LeaderboardScopeTabs';
import { CreatorScoreCard } from '@/components/CreatorScoreCard';

interface Season {
  name: string;
  daysRemaining: number;
  theme?: string;
}

interface RankData {
  rank: number;
  pointsThisWeek: number;
}

interface LeaderUser {
  id: string;
  rank: number;
  username: string;
  name: string | null;
  avatarUrl?: string | null;
  tier: string;
  streakDays: number;
  pointsThisWeek: number;
  creatorScore?: number | null;
}

const TIER_EMOJI: Record<string, string> = {
  explorer: '🌱',
  engager: '⚡',
  influencer: '🌟',
  champion: '👑',
};

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [season, setSeason] = useState<Season | null>(null);
  const [myRank, setMyRank] = useState<RankData | null>(null);
  const [leaders, setLeaders] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scope, setScope] = useState<Scope>('pincode');

  const loadAll = async () => {
    try {
      const [seasonData, rankData, leaderData] = await Promise.allSettled([
        leaderboardService.getCurrentSeason(),
        leaderboardService.getMyRank(),
        leaderboardService.getLeaderboard(scope),
      ]);

      if (seasonData.status === 'fulfilled') setSeason(seasonData.value);
      if (rankData.status === 'fulfilled') {
        const r = rankData.value;
        setMyRank(
          r && r.rank !== null
            ? { rank: r.rank, pointsThisWeek: r.pointsThisWeek ?? 0 }
            : null,
        );
      }
      if (leaderData.status === 'fulfilled') {
        setLeaders((leaderData.value?.rankings ?? []) as LeaderUser[]);
      }
    } catch {}
  };

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [scope]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const daysLeft = season?.daysRemaining ?? null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Scope tabs */}
      <LeaderboardScopeTabs scope={scope} onChange={setScope} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.navy} />
        }
      >
        {/* Season banner */}
        <View style={styles.seasonBanner}>
          <Text style={styles.seasonEmoji}>🏆</Text>
          <View style={styles.seasonInfo}>
            <Text style={styles.seasonName}>{season?.name ?? 'Current Season'}</Text>
            {daysLeft !== null && (
              <Text style={styles.seasonDays}>{daysLeft} days remaining</Text>
            )}
          </View>
          {season?.theme ? (
            <Text style={styles.seasonTheme}>{season.theme}</Text>
          ) : null}
        </View>

        {/* My rank card */}
        {myRank ? (
          <View style={styles.myRankCard}>
            <View style={styles.myRankLeft}>
              <Text style={styles.myRankLabel}>Your Rank</Text>
              <Text style={styles.myRankNumber}>#{myRank.rank}</Text>
            </View>
            <View style={styles.myRankDivider} />
            <View style={styles.myRankStat}>
              <Text style={styles.myRankStatVal}>{myRank.pointsThisWeek.toLocaleString()}</Text>
              <Text style={styles.myRankStatLabel}>This week</Text>
            </View>
            <View style={styles.myRankDivider} />
            <View style={styles.myRankStat}>
              <Text style={styles.myRankStatVal}>
                {TIER_EMOJI[user?.tier ?? 'explorer'] ?? '🌱'} {user?.tier ?? 'explorer'}
              </Text>
              <Text style={styles.myRankStatLabel}>Tier</Text>
            </View>
          </View>
        ) : null}

        {/* Podium for top 3 */}
        <LeaderboardPodium
          top3={leaders.slice(0, 3).map((u, i) => ({
            rank: u.rank ?? i + 1,
            username: u.username,
            avatarUrl: u.avatarUrl,
            pointsThisWeek: u.pointsThisWeek,
          }))}
        />

        {/* Top users list */}
        <Text style={styles.sectionTitle}>Top Creators</Text>

        {leaders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No leaderboard data yet</Text>
          </View>
        ) : (
          leaders.map((user, index) => {
            const isTopThree = index < 3;
            const tierColor = tierColors[user.tier] ?? colors.g400;
            return (
              <View
                key={user.id}
                style={[styles.leaderRow, isTopThree && styles.leaderRowGold]}
              >
                {/* Rank */}
                <View style={styles.rankCol}>
                  {index < 3 ? (
                    <Text style={styles.medal}>{RANK_MEDALS[index]}</Text>
                  ) : (
                    <Text style={styles.rankNum}>#{user.rank}</Text>
                  )}
                </View>

                {/* Avatar placeholder */}
                <View style={[styles.avatar, { borderColor: tierColor }]}>
                  <Text style={styles.avatarInitial}>
                    {(user.name ?? user.username ?? '?')[0].toUpperCase()}
                  </Text>
                </View>

                {/* Name + tier + streak */}
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user.name ?? user.username}
                  </Text>
                  <View style={styles.userMeta}>
                    <Text style={[styles.userTier, { color: tierColor }]}>
                      {TIER_EMOJI[user.tier ?? 'explorer'] ?? '🌱'} {user.tier ?? 'explorer'}
                    </Text>
                    {(user.streakDays ?? 0) > 0 && (
                      <Text style={styles.userStreak}>🔥 {user.streakDays}d</Text>
                    )}
                  </View>
                </View>

                {/* Weekly points + creator score (compact) */}
                <View style={styles.rightCol}>
                  <Text style={styles.weeklyPts}>
                    {(user.pointsThisWeek ?? 0).toLocaleString()} pts
                  </Text>
                  {user.creatorScore != null && (
                    <CreatorScoreCard
                      score={user.creatorScore}
                      compact
                    />
                  )}
                </View>
              </View>
            );
          })
        )}

        <WeeklyQuestsCard />

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
    backgroundColor: colors.card,
  },
  backBtn: { padding: spacing.xs },
  backArrow: { fontSize: 22, color: colors.g800, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.g900 },
  headerSpacer: { width: 30 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  seasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy,
    margin: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  seasonEmoji: { fontSize: 28 },
  seasonInfo: { flex: 1 },
  seasonName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  seasonDays: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  seasonTheme: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' },

  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.g100,
  },
  myRankLeft: { alignItems: 'center', flex: 1 },
  myRankLabel: { fontSize: 11, color: colors.g500, textTransform: 'uppercase', letterSpacing: 0.5 },
  myRankNumber: { fontSize: 32, fontWeight: '800', color: colors.navy },
  myRankDivider: { width: 0.5, height: 40, backgroundColor: colors.g200 },
  myRankStat: { flex: 1, alignItems: 'center' },
  myRankStatVal: { fontSize: 15, fontWeight: '700', color: colors.g900, textTransform: 'capitalize' },
  myRankStatLabel: { fontSize: 11, color: colors.g500, marginTop: 2 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.g900,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
    gap: spacing.md,
  },
  leaderRowGold: {
    backgroundColor: 'rgba(217,119,6,0.06)',
  },
  rankCol: { width: 32, alignItems: 'center' },
  medal: { fontSize: 22 },
  rankNum: { fontSize: 14, fontWeight: '700', color: colors.g500 },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: colors.g100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 18, fontWeight: '700', color: colors.g700 },

  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: colors.g900 },
  userMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: 2 },
  userTier: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  userStreak: { fontSize: 12, color: colors.orange },

  rightCol: { alignItems: 'flex-end', gap: spacing.xs },
  weeklyPts: { fontSize: 14, fontWeight: '700', color: colors.navy },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.g500 },
  bottomPad: { height: spacing.xxxl },
});
