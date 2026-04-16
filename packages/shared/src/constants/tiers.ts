import type { Tier } from '../types/user.js';

export interface TierConfig {
  tier: Tier;
  threshold: number;
  multiplier: number;
  monthlyBonus: number;
  label: string;
  emoji: string;
}

export const TIER_CONFIGS: Record<Tier, TierConfig> = {
  explorer: { tier: 'explorer', threshold: 0, multiplier: 1.0, monthlyBonus: 0, label: 'Explorer', emoji: '\u{1F331}' },
  engager: { tier: 'engager', threshold: 2000, multiplier: 1.2, monthlyBonus: 100, label: 'Engager', emoji: '\u{26A1}' },
  influencer: { tier: 'influencer', threshold: 10000, multiplier: 1.5, monthlyBonus: 300, label: 'Influencer', emoji: '\u{1F525}' },
  champion: { tier: 'champion', threshold: 50000, multiplier: 2.0, monthlyBonus: 1000, label: 'Champion', emoji: '\u{1F451}' },
};

export const TIER_ORDER: Tier[] = ['explorer', 'engager', 'influencer', 'champion'];

export function getTierForPoints(lifetimePoints: number): Tier {
  if (lifetimePoints >= TIER_CONFIGS.champion.threshold) return 'champion';
  if (lifetimePoints >= TIER_CONFIGS.influencer.threshold) return 'influencer';
  if (lifetimePoints >= TIER_CONFIGS.engager.threshold) return 'engager';
  return 'explorer';
}

export function getNextTier(currentTier: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

export function getMultiplier(tier: Tier): number {
  return TIER_CONFIGS[tier].multiplier;
}
