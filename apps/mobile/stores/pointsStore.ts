import { create } from 'zustand';
import { pointsService } from '../services/pointsService';
import { feedService } from '../services/feedService';

interface PointsState {
  balance: number; streak: number; tier: string; dailyEarned: number; dailyGoal: number;
  lastToast: { points: number; timestamp: number } | null;
  earn: (actionType: string, contentId?: string, metadata?: Record<string, any>) => Promise<void>;
  refreshSummary: () => Promise<void>;
  dismissToast: () => void;
}

export const usePointsStore = create<PointsState>((set) => ({
  balance: 0, streak: 0, tier: 'explorer', dailyEarned: 0, dailyGoal: 250, lastToast: null,
  earn: async (actionType, contentId, metadata) => {
    try {
      const result = await pointsService.earn({ actionType, contentId, metadata });
      set({ balance: result.newBalance, streak: result.streak, dailyEarned: result.dailyProgress.earned, dailyGoal: result.dailyProgress.goal, lastToast: { points: result.points, timestamp: Date.now() } });
    } catch {}
  },
  refreshSummary: async () => {
    try {
      const summary = await feedService.getWalletSummary();
      set({ balance: summary.balance, streak: summary.streak, tier: summary.tier });
    } catch {}
  },
  dismissToast: () => set({ lastToast: null }),
}));
