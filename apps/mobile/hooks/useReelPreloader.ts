import { useMemo } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';

export interface NetworkLike {
  type?: string;
  isConnected?: boolean | null;
  details?: { cellularGeneration?: string | null; downlinkMbps?: number } | null;
}

export function preloadCountForBandwidth(state: NetworkLike): number {
  if (state.type === 'none' || state.isConnected === false) return 0;
  if (state.type === 'wifi') return 3;
  if (state.type === 'cellular') {
    const details = state.details ?? undefined;
    if (details?.downlinkMbps !== undefined) {
      if (details.downlinkMbps < 1) return 0;
      if (details.downlinkMbps < 3) return 1;
      if (details.downlinkMbps < 6) return 2;
      return 3;
    }
    const gen = details?.cellularGeneration;
    if (gen === '2g') return 0;
    if (gen === '3g') return 1;
    if (gen === '4g' || gen === '5g') return 2;
    return 1;
  }
  return 1;
}

export interface UseReelPreloaderArgs {
  activeIndex: number;
}

export interface UseReelPreloaderResult {
  preloadCount: number;
  indicesToPreload: number[];
}

export function useReelPreloader({ activeIndex }: UseReelPreloaderArgs): UseReelPreloaderResult {
  const netInfo = useNetInfo();
  const preloadCount = preloadCountForBandwidth(netInfo as NetworkLike);
  const indicesToPreload = useMemo(() => {
    if (preloadCount === 0) return [];
    const ahead = Array.from({ length: preloadCount }, (_, i) => activeIndex + 1 + i);
    // Only preload behind when bandwidth is plentiful (≥2 ahead). On 3g we
    // skip behind entirely so the limited budget goes to the next swipe.
    const behind = preloadCount >= 2 && activeIndex - 1 >= 0 ? [activeIndex - 1] : [];
    return [...behind, ...ahead].filter((i) => i >= 0);
  }, [activeIndex, preloadCount]);

  return { preloadCount, indicesToPreload };
}
