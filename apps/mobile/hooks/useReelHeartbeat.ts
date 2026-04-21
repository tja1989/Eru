import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { usePointsStore } from '../stores/pointsStore';

interface Options {
  reelId: string;
  enabled: boolean;
  intervalMs?: number;
}

/**
 * Fires earn('reel_watch', reelId, { watchTimeSeconds }) every `intervalMs`
 * (default 30s) while `enabled === true` AND the app is foregrounded. Pauses
 * on background/inactive and resumes when the user comes back. Dedup isn't
 * needed — the server's daily cap on reel_watch caps the credit naturally,
 * and re-firing after a pause is the correct signal for continued watch.
 */
export function useReelHeartbeat({ reelId, enabled, intervalMs = 30_000 }: Options) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
      // If we just went background, kill the timer so we don't accumulate
      // watch time while the user is elsewhere.
      if (next !== 'active' && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // If we came back to active and the reel is still enabled, restart.
      if (next === 'active' && enabled && !timerRef.current) {
        startTimer();
      }
    });

    function startTimer() {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => {
        // Only fire if currently active — belt-and-braces against the
        // AppState listener missing a transition.
        if (appStateRef.current !== 'active') return;
        usePointsStore.getState().earn('reel_watch', reelId, {
          watchTimeSeconds: Math.floor(intervalMs / 1000),
        });
      }, intervalMs);
    }

    if (enabled && appStateRef.current === 'active') {
      startTimer();
    }

    return () => {
      sub.remove();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, reelId, intervalMs]);
}
