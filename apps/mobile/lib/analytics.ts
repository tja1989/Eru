// Thin facade around Sentry's measurement / breadcrumb API. All player and
// startup metrics route through here so we can swap Sentry for PostHog (or
// add a second backend) by editing one file.
//
// Sentry is loaded lazily — if the native module isn't present (jest, dev
// builds without DSN), every `emit()` is a silent no-op.

type MetricName =
  | 'ttff'
  | 'rebuffer_start'
  | 'rebuffer_end'
  | 'bitrate_switch'
  | 'cold_start'
  | 'error';

type MetricPayload = Record<string, unknown>;

let cachedSentry: typeof import('@sentry/react-native') | null = null;

function getSentry(): typeof import('@sentry/react-native') | null {
  if (cachedSentry !== null) return cachedSentry;
  try {
    cachedSentry = require('@sentry/react-native');
  } catch {
    cachedSentry = null;
  }
  return cachedSentry;
}

export const analytics = {
  emit(name: MetricName, payload: MetricPayload = {}): void {
    const Sentry = getSentry();
    if (!Sentry) return;
    try {
      Sentry.addBreadcrumb?.({
        category: 'perf',
        message: name,
        data: payload,
        level: 'info',
      });
      if (
        (name === 'ttff' || name === 'cold_start' || name === 'rebuffer_end') &&
        typeof payload.durationMs === 'number'
      ) {
        Sentry.setMeasurement?.(name, payload.durationMs as number, 'millisecond');
      }
    } catch {
      // Sentry not initialised → drop metric. Never fail the caller.
    }
  },
};

export function _resetAnalyticsForTests(): void {
  cachedSentry = null;
}
