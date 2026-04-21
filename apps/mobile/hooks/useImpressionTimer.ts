import { useEffect, useRef } from 'react';

interface Options {
  enabled: boolean;
  thresholdMs: number;
  onImpression: () => void;
}

// Fires onImpression once per component lifetime after `thresholdMs` of
// continuous `enabled === true`. Used by PostCard to credit view_sponsored
// after the card has been on screen (isActive + isSponsored) for 2 seconds.
// The "once per lifetime" rule prevents double-credit if the user scrolls
// away then back on the same card; a fresh card mount (e.g. next session)
// starts a new lifetime.
export function useImpressionTimer({ enabled, thresholdMs, onImpression }: Options) {
  const firedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest callback in a ref so changing it mid-timer doesn't reset.
  const onImpressionRef = useRef(onImpression);
  onImpressionRef.current = onImpression;

  useEffect(() => {
    if (firedRef.current) return;
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }
    timerRef.current = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        onImpressionRef.current();
      }
    }, thresholdMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, thresholdMs]);
}
