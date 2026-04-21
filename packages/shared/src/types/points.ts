import type { Tier } from './user.js';

export type ActionType =
  | 'read_article' | 'watch_video' | 'reel_watch' | 'listen_podcast' | 'read_thread'
  | 'like' | 'comment' | 'share' | 'save' | 'follow'
  | 'daily_checkin' | 'create_content' | 'content_trending' | 'refer_friend' | 'complete_profile'
  | 'welcome_bonus'
  | 'view_sponsored' | 'click_sponsored_cta';

export interface PointsLedgerEntry {
  id: string;
  userId: string;
  actionType: ActionType;
  contentId: string | null;
  points: number;
  multiplierApplied: number;
  expiresAt: string;
  redeemedAt: string | null;
  expired: boolean;
  createdAt: string;
}

export interface EarnResult {
  success: boolean;
  points: number;
  multiplier: number;
  newBalance: number;
  dailyProgress: { earned: number; goal: number; };
  streak: number;
}

export interface WalletSummary {
  balance: number;
  rupeeValue: number;
  dailyEarned: number;
  dailyGoal: number;
  streak: number;
  tier: Tier;
  currentTier: Tier;
  nextTier: Tier | null;
  pointsToNext: number;
  tierProgress: number;
  lifetimePoints: number;
  expiringPoints: number;
  expiringDays: number | null;
}

export interface WalletResponse {
  wallet: WalletSummary;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string | null;
  username: string;
  avatarUrl: string | null;
  tier: Tier;
  isVerified: boolean;
  streakDays: number;
  creatorScore: number | null;
  pointsThisWeek: number;
}

export interface LeaderboardResponse {
  rankings: LeaderboardEntry[];
  scope: string;
  pincode?: string;
}

export interface MyRankResponse {
  rank: number | null;
  pointsThisWeek: number;
  scope: string;
  pincode: string;
}

// GET /wallet/history — paginated points ledger.
// Date fields accept `Date | string` because Fastify serializes Dates to ISO
// strings over the wire; API handlers pass Prisma Dates, mobile receives strings.
export interface WalletHistoryEntry {
  id: string;
  points: number;
  actionType: ActionType | string;
  createdAt: string | Date;
  expiresAt: string | Date | null;
}

export interface WalletHistoryResponse {
  data: WalletHistoryEntry[];
  nextPage: number | null;
  total: number;
}

// GET /wallet/expiring — points ledger entries expiring soon.
export interface ExpiringPointsEntry {
  id: string;
  points: number;
  actionType: ActionType | string;
  createdAt: string | Date;
  expiresAt: string | Date;
}

export interface WalletExpiringResponse {
  expiringEntries: ExpiringPointsEntry[];
  totalExpiring: number;
  warningDays: number;
}

// GET /season/current — quarterly season metadata.
export interface SeasonResponse {
  name: string;
  quarter: number;
  year: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
}

// GET /quests/weekly — per-user weekly quest progress.
export interface WeeklyQuest {
  id: string;
  title: string;
  description: string | null;
  actionType: string;
  targetCount: number;
  rewardPoints: number;
  currentCount: number;
  completed: boolean;
}

export interface WeeklyQuestsResponse {
  quests: WeeklyQuest[];
}
