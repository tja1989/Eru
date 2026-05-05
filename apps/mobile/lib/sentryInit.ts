// Sentry mobile init. No-op when EXPO_PUBLIC_SENTRY_DSN is unset, so dev
// builds without a DSN remain silent. The wizard-installed native build
// plugin is OPTIONAL — without it, source maps don't symbolicate but the
// SDK still captures errors.
//
// Lazy-loaded so the native module's heavy native side isn't pulled in
// before the user has interacted (see _layout.tsx — initSentry is called
// from inside the deferred-startup useEffect).

let initialised = false;

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn || initialised) return;

  // Dynamic require so jest test environments without @sentry/react-native
  // installed (or platform-specific code paths) don't crash on import.
  const Sentry = require('@sentry/react-native');

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enableAutoPerformanceTracing: true,
    enableAutoSessionTracking: true,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    beforeSend(event: { contexts?: { auth?: unknown } }) {
      if (event.contexts?.auth) delete event.contexts.auth;
      return event;
    },
  });

  initialised = true;
}

export function _resetSentryInitForTests(): void {
  initialised = false;
}
