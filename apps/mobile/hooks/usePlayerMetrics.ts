import { useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';

const ttffFiredFor = new Set<string>();

export function _resetMetricsForTest(): void {
  ttffFiredFor.clear();
}

export interface PlayerLike {
  // Loose signature so we can accept expo-video's strongly-typed VideoPlayer
  // without per-event-name casts.
  addListener: (event: string, cb: any) => (() => void) | unknown;
}

interface StatusChangePayload {
  status?: 'idle' | 'loading' | 'readyToPlay' | 'error';
  oldStatus?: 'idle' | 'loading' | 'readyToPlay' | 'error';
}

/**
 * Subscribes to expo-video player events and emits TTFF (time-to-first-frame)
 * + rebuffer_start/end metrics via the analytics facade. Pass `player = null`
 * to disable metering for inactive reels.
 *
 * expo-video 3.x emits a single `statusChange` event with idle → loading →
 * readyToPlay transitions, so:
 *   - first transition INTO readyToPlay = TTFF (per reel, fires once)
 *   - any later transition INTO loading = rebuffer start
 *   - the next transition back to readyToPlay = rebuffer end
 *
 * (Earlier drafts of this hook subscribed to `readyForDisplay` / `playbackStalled`
 * / `bitrateChange` per the M5 plan — those names don't exist in the
 * VideoPlayerEvents type, so the hook silently emitted nothing.)
 */
export function usePlayerMetrics(player: PlayerLike | null, reelId: string): void {
  const startedAtRef = useRef<number>(Date.now());
  const hasReachedReadyRef = useRef<boolean>(false);
  const rebufferStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!player) return;
    startedAtRef.current = Date.now();
    hasReachedReadyRef.current = false;
    rebufferStartRef.current = null;

    const off = player.addListener('statusChange', (payload?: unknown) => {
      const status = (payload as StatusChangePayload | undefined)?.status;

      if (status === 'readyToPlay') {
        if (!hasReachedReadyRef.current) {
          hasReachedReadyRef.current = true;
          if (!ttffFiredFor.has(reelId)) {
            ttffFiredFor.add(reelId);
            analytics.emit('ttff', {
              reelId,
              durationMs: Date.now() - startedAtRef.current,
            });
          }
        }
        if (rebufferStartRef.current !== null) {
          const duration = Date.now() - rebufferStartRef.current;
          rebufferStartRef.current = null;
          analytics.emit('rebuffer_end', { reelId, durationMs: duration });
        }
      } else if (status === 'loading' && hasReachedReadyRef.current) {
        if (rebufferStartRef.current === null) {
          rebufferStartRef.current = Date.now();
          analytics.emit('rebuffer_start', { reelId });
        }
      }
    });

    return () => {
      if (typeof off === 'function') off();
    };
  }, [player, reelId]);
}
