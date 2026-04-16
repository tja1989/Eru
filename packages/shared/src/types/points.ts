export type ActionType =
  | 'read_article' | 'watch_video' | 'reel_watch' | 'listen_podcast' | 'read_thread'
  | 'like' | 'comment' | 'share' | 'save' | 'follow'
  | 'daily_checkin' | 'create_content' | 'content_trending' | 'refer_friend' | 'complete_profile';

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
  dailyEarned: number;
  dailyGoal: number;
  streak: number;
  tier: string;
  tierProgress: { current: number; next: number; pointsNeeded: number; };
  expiringPoints: { amount: number; daysRemaining: number; } | null;
}
