import React, { useEffect, useState, useCallback } from 'react';
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
import { walletService } from '../../services/walletService';
import { usePointsStore } from '../../stores/pointsStore';
import { colors, spacing, radius } from '../../constants/theme';

interface WalletData {
  balance: number;
  rupeeValue: number;
  dailyEarned: number;
  dailyGoal: number;
  expiringPoints?: number;
  expiringDays?: number;
}

interface HistoryItem {
  id: string;
  actionType: string;
  points: number;
  createdAt: string;
  description?: string;
}

const ACTION_LABELS: Record<string, string> = {
  post_like: 'Like received',
  post_comment: 'Comment received',
  post_create: 'Post created',
  reel_create: 'Reel created',
  reel_view: 'Reel viewed',
  daily_login: 'Daily login bonus',
  streak_bonus: 'Streak bonus',
  brand_collab: 'Brand collaboration',
};

export default function WalletScreen() {
  const router = useRouter();
  const { balance: storeBalance, dailyEarned, dailyGoal } = usePointsStore();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadWallet = async () => {
    try {
      const data = await walletService.getWallet();
      setWallet({
        balance: data.balance ?? storeBalance,
        rupeeValue: data.rupeeValue ?? Math.floor((data.balance ?? storeBalance) * 0.01),
        dailyEarned: data.dailyEarned ?? dailyEarned,
        dailyGoal: data.dailyGoal ?? dailyGoal,
        expiringPoints: data.expiringPoints,
        expiringDays: data.expiringDays,
      });
    } catch {
      setWallet({
        balance: storeBalance,
        rupeeValue: Math.floor(storeBalance * 0.01),
        dailyEarned,
        dailyGoal,
      });
    }
  };

  const loadHistory = useCallback(async (pageNum: number) => {
    setHistoryLoading(true);
    try {
      const data = await walletService.getHistory(pageNum);
      const items: HistoryItem[] = data.data ?? data.items ?? data.history ?? [];
      if (pageNum === 1) {
        setHistory(items);
      } else {
        setHistory((prev) => [...prev, ...items]);
      }
      setHasMore(items.length >= 20);
    } catch {
      if (pageNum === 1) setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadWallet(), loadHistory(1)]).finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await Promise.all([loadWallet(), loadHistory(1)]);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!hasMore || historyLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadHistory(nextPage);
  };

  const progressPct = wallet
    ? Math.min((wallet.dailyEarned / (wallet.dailyGoal || 1)) * 100, 100)
    : 0;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
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
        <Text style={styles.headerTitle}>Wallet</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.navy} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Balance card — navy gradient look */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Points</Text>
          <Text style={styles.balanceAmount}>
            {(wallet?.balance ?? storeBalance).toLocaleString()}
          </Text>
          <Text style={styles.rupeeLabel}>
            ≈ ₹{(wallet?.rupeeValue ?? 0).toLocaleString()}
          </Text>

          {/* Expiry warning */}
          {wallet?.expiringPoints && wallet.expiringDays ? (
            <View style={styles.expiryBanner}>
              <Text style={styles.expiryText}>
                ⚠️ {wallet.expiringPoints.toLocaleString()} pts expiring in {wallet.expiringDays} days
              </Text>
            </View>
          ) : null}
        </View>

        {/* Daily progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Daily Progress</Text>
            <Text style={styles.progressCount}>
              {(wallet?.dailyEarned ?? dailyEarned).toLocaleString()} / {(wallet?.dailyGoal ?? dailyGoal).toLocaleString()} pts
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressHint}>
            {progressPct >= 100
              ? 'Daily goal reached! Great work.'
              : `${(100 - progressPct).toFixed(0)}% to go — keep earning`}
          </Text>
        </View>

        {/* Earning history */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Earning History</Text>

          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💰</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyAction}>
                    {ACTION_LABELS[item.actionType] ?? item.actionType.replace(/_/g, ' ')}
                  </Text>
                  {item.description ? (
                    <Text style={styles.historyDesc} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={[styles.historyPoints, item.points >= 0 ? styles.positive : styles.negative]}>
                  {item.points >= 0 ? '+' : ''}{item.points} pts
                </Text>
              </View>
            ))
          )}

          {historyLoading && (
            <View style={styles.loadMoreSpinner}>
              <ActivityIndicator color={colors.navy} />
            </View>
          )}

          {!hasMore && history.length > 0 && (
            <Text style={styles.endText}>You've seen it all</Text>
          )}
        </View>
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

  balanceCard: {
    margin: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.navy,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: spacing.xs, letterSpacing: 0.5, textTransform: 'uppercase' },
  balanceAmount: { fontSize: 48, fontWeight: '800', color: '#fff', lineHeight: 56 },
  rupeeLabel: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs },
  expiryBanner: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(237,73,86,0.25)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  expiryText: { fontSize: 13, color: '#FCA5A5', fontWeight: '600' },

  progressCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 0.5,
    borderColor: colors.g100,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  progressTitle: { fontSize: 15, fontWeight: '700', color: colors.g800 },
  progressCount: { fontSize: 13, color: colors.g500, fontWeight: '600' },
  progressTrack: {
    height: 8,
    backgroundColor: colors.g100,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.navy,
    borderRadius: radius.full,
  },
  progressHint: { fontSize: 12, color: colors.g500 },

  historySection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xxxl,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.g900, marginBottom: spacing.md },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  historyLeft: { flex: 1, marginRight: spacing.md },
  historyAction: { fontSize: 14, fontWeight: '600', color: colors.g800, textTransform: 'capitalize' },
  historyDesc: { fontSize: 12, color: colors.g500, marginTop: 2 },
  historyDate: { fontSize: 11, color: colors.g400, marginTop: 4 },
  historyPoints: { fontSize: 15, fontWeight: '700' },
  positive: { color: colors.green },
  negative: { color: colors.red },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.g500 },
  loadMoreSpinner: { paddingVertical: spacing.lg, alignItems: 'center' },
  endText: { textAlign: 'center', fontSize: 12, color: colors.g400, paddingVertical: spacing.lg },
});
