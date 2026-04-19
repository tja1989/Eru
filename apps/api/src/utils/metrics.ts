import * as Sentry from '@sentry/node';

/**
 * Emits a numeric gauge to whatever observability backend is configured.
 * Currently routes to Sentry as a measurement on the active span. When
 * Sentry isn't initialised (no SENTRY_DSN), this is a no-op — safe to
 * call from any code path without env-flag checks at the call site.
 */
export function emitGauge(name: string, value: number, unit: string = 'none'): void {
  const setMeasurement = (Sentry as unknown as {
    setMeasurement?: (name: string, value: number, unit: string) => void;
  }).setMeasurement;
  if (typeof setMeasurement === 'function') {
    try {
      setMeasurement(name, value, unit);
    } catch {
      // Sentry not initialised or no active span — drop silently.
    }
  }
}
