import { useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';

const ttffFiredFor = new Set<string>();

export function _resetMetricsForTest(): void {
  ttffFiredFor.clear();
}

export interface PlayerLike {
  // Loose signature so we can accept expo-video's strongly-typed
  // VideoPlayer without per-event-name casts.
  addListener: (event: string, cb: any) => (() => void) | unknown;
}

/**
 * Subscribes to expo-video player events and emits TTFF (time-to-first-frame),
 * rebuffer_start/end, and bitrate_switch metrics via the analytics facade.
 *
 * Pass `player = null` to disable metering for inactive reels. Metering only
 * the active reel keeps rebuffer data clean — preloaded players that never
 * actually play would otherwise look like permanent stalls.
 */
export function usePlayerMetrics(player: PlayerLike | null, reelId: string): void {
  const startedAtRef = useRef<number>(Date.now());
  const rebufferStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!player) return;
    startedAtRef.current = Date.now();

    const subs: Array<unknown> = [];
    const callIfFn = (s: unknown) => {
      if (typeof s === 'function') s();
    };

    subs.push(player.addListener('readyForDisplay', () => {
      if (!ttffFiredFor.has(reelId)) {
        ttffFiredFor.add(reelId);
        analytics.emit('ttff', {
          reelId,
          durationMs: Date.now() - startedAtRef.current,
        });
      }
    }));

    subs.push(player.addListener('playbackStalled', () => {
      if (rebufferStartRef.current === null) {
        rebufferStartRef.current = Date.now();
        analytics.emit('rebuffer_start', { reelId });
      }
    }));

    subs.push(player.addListener('playbackStarted', () => {
      if (rebufferStartRef.current !== null) {
        const duration = Date.now() - rebufferStartRef.current;
        rebufferStartRef.current = null;
        analytics.emit('rebuffer_end', { reelId, durationMs: duration });
      }
    }));

    subs.push(player.addListener('bitrateChange', (payload?: unknown) => {
      const p = payload as { oldBitrate?: number; newBitrate?: number } | undefined;
      analytics.emit('bitrate_switch', {
        reelId,
        oldBitrate: p?.oldBitrate,
        newBitrate: p?.newBitrate,
      });
    }));

    return () => subs.forEach(callIfFn);
  }, [player, reelId]);
}
