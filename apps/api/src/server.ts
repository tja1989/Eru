import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Init Sentry BEFORE importing the app, so Fastify routes get auto-instrumented.
// No-op when SENTRY_DSN is unset, so dev/test shells stay quiet.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV ?? 'development',
    beforeSend(event) {
      // Strip request bodies on auth routes so PII (phone numbers, OTPs) never leaves the server.
      const url = event.request?.url;
      if (url && /\/(auth|whatsapp-otp)/.test(url) && event.request) {
        delete event.request.data;
      }
      return event;
    },
  });
}

import { buildApp } from './app.js';
import { getConfig } from './config/index.js';
import { startCronJobs } from './jobs/index.js';

async function start() {
  const config = getConfig();
  const app = buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Eru API running on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  if (config.NODE_ENV !== 'test') {
    startCronJobs();
  }
}

start();
