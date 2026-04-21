export interface BadgeItem {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  threshold: number | null;
  unlockedAt: string | null;
  isUnlocked: boolean;
}

export interface BadgesResponse {
  badges: BadgeItem[];
}

export interface BadgesCheckResponse {
  success: boolean;
}
