# M5 — Performance Monitoring

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:executing-plans`, `superpowers:test-driven-development`. M5 is parallelisable with M2/M3/M4 and ideally ships alongside each so impact can be measured. TDD rules per `GapFix/SpeedOptimization.md#7-tdd-protocol-agent-first`.

## 1. Goal

Install Sentry Performance on both API and mobile. Emit custom streaming metrics (TTFF, rebuffer, bitrate switches). Set CloudWatch alarms on the MediaConvert pipeline. Define alert thresholds that page the founder via Slack/email.

## 2. Analogy

Install cameras in the kitchen and dining room. Not to watch customers, but to answer questions like: "Why did diner #47 wait 8 minutes for their plate?" Without cameras, every complaint is "the food was slow" with no diagnosis.

## 3. Why we need this

- Without monitoring, we cannot tell if M0–M4 actually shipped value. Every performance claim is vibes-based.
- Sentry Performance: standard choice; already integrates with Fastify + expo-router.
- CloudWatch: AWS-native, free tier covers MediaConvert + CloudFront metrics.
- The alert threshold numbers below give the founder a single dashboard to glance at.

## 4. Files to modify

| File | Change |
|---|---|
| `apps/api/package.json` | Add `@sentry/node` + `@sentry/profiling-node` |
| `apps/api/src/server.ts` | `Sentry.init(...)` BEFORE `import app from './app.js'` |
| `apps/api/src/app.ts` | `Sentry.setupFastifyErrorHandler(app)` after app creation |
| `apps/api/src/utils/metrics.ts` | **NEW** — thin facade for emitting custom metrics (Sentry + CloudWatch) |
| `apps/api/src/jobs/metricsCron.ts` | **NEW** — every minute, query Prisma for job-queue depth, emit custom metric |
| `apps/api/tests/utils/metrics.test.ts` | **NEW** |
| `apps/mobile/package.json` | Add `@sentry/react-native` |
| `apps/mobile/app/_layout.tsx` | Sentry init (deferred per M4.4) |
| `apps/mobile/hooks/usePlayerMetrics.ts` | **NEW** — wraps expo-video, emits TTFF/rebuffer/bitrate_switch |
| `apps/mobile/__tests__/hooks/usePlayerMetrics.test.ts` | **NEW** |
| `apps/mobile/app/(tabs)/reels.tsx` | Call `usePlayerMetrics(player, reelId)` for the active reel |
| `apps/mobile/lib/analytics.ts` | **NEW** — thin facade so Sentry can be swapped for PostHog later without touching call sites |
| AWS | CloudWatch alarms: MediaConvert queue depth > 100, CloudFront cache hit ratio < 85%, API error rate > 1% |

## 5. Alert thresholds (non-negotiable)

| Metric | Warning | Critical | Action |
|---|---|---|---|
| TTFF p75 (mobile) | >2s | >3s | Page founder |
| Rebuffer ratio | >1.5% | >3% | Page founder |
| MediaConvert queue depth | >50 | >200 | Page engineering |
| MediaConvert job failure rate | >5% | >15% | Page engineering |
| CloudFront cache hit ratio | <85% | <70% | Review cache policy |
| API p95 latency `/feed` | >500ms | >1s | Investigate DB / Redis |
| API error rate 5xx | >0.5% | >2% | Page founder |
| Cold start p95 (mobile) | >3s | >5s | Investigate |

## 6. Ordered TDD tasks

### Task M5.1 — Sentry API init + error capture

- [ ] **Step 1: Install.** From `apps/api/`:

```bash
npm install @sentry/node @sentry/profiling-node
```

- [ ] **Step 2: Failing test.** Create `apps/api/tests/routes/sentry-capture.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import * as Sentry from '@sentry/node';
import type { FastifyInstance } from 'fastify';
import { getTestApp, closeTestApp } from '../helpers/setup.js';

const captureSpy = vi.spyOn(Sentry, 'captureException');

describe('Sentry captures uncaught errors on API routes', () => {
  let app: FastifyInstance;
  beforeAll(async () => {
    app = await getTestApp();
    // Add a dev-only throwing route for the test
    app.get('/_test-boom', async () => {
      throw new Error('Boom');
    });
  });
  afterAll(async () => { await closeTestApp(app); });

  it('calls Sentry.captureException when a route throws 5xx', async () => {
    captureSpy.mockClear();
    const res = await app.inject({ method: 'GET', url: '/_test-boom' });
    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    expect(captureSpy).toHaveBeenCalled();
  });

  it('does NOT capture client errors (400, 401, 403, 404)', async () => {
    captureSpy.mockClear();
    const res = await app.inject({ method: 'GET', url: '/api/v1/unknown-route' });
    expect(res.statusCode).toBe(404);
    expect(captureSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement.** Edit `apps/api/src/server.ts` at the TOP (before app import):

```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Init Sentry BEFORE importing the app, so Fastify routes get auto-instrumented.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV ?? 'development',
    // Strip request bodies from auth routes to avoid PII leakage
    beforeSend(event) {
      const url = event.request?.url;
      if (url && /\/(auth|whatsapp-otp)/.test(url)) {
        if (event.request) delete event.request.data;
      }
      return event;
    },
  });
}

// Now import the app
import { buildApp } from './app.js';
// ... rest of server startup
```

Edit `apps/api/src/app.ts` to hook the error handler:

```typescript
// Near the top, after `const app = Fastify(...);`:
if (process.env.SENTRY_DSN) {
  Sentry.setupFastifyErrorHandler(app);
}
```

- [ ] **Step 4: Verify green.**

- [ ] **Step 5: Smoke-test in staging.** Trigger a controlled 500 via a debug endpoint; confirm it appears in the Sentry dashboard within ~30s.

### Task M5.2 — Sentry mobile init

- [ ] **Step 1: Install.** From `apps/mobile/`:

```bash
npm install @sentry/react-native
npx @sentry/wizard -i reactNative  # Configures build plugin; follow prompts
```

- [ ] **Step 2: Failing test.** Create `apps/mobile/__tests__/runtime/sentry-init.test.ts`:

```typescript
const initSpy = jest.fn();
jest.mock('@sentry/react-native', () => ({
  init: initSpy,
  captureException: jest.fn(),
  Severity: { Error: 'error', Warning: 'warning' },
  reactNativeTracingIntegration: jest.fn(),
}));

describe('Mobile Sentry init', () => {
  beforeEach(() => { jest.resetModules(); initSpy.mockClear(); });

  it('calls Sentry.init with a DSN when SENTRY_DSN is set', () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://abc@sentry.io/123';
    require('@/lib/sentryInit').initSentry();
    expect(initSpy).toHaveBeenCalled();
    const config = initSpy.mock.calls[0][0];
    expect(config.dsn).toBe('https://abc@sentry.io/123');
  });

  it('no-ops when DSN missing', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    require('@/lib/sentryInit').initSentry();
    expect(initSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement.** Create `apps/mobile/lib/sentryInit.ts`:

```typescript
import * as Sentry from '@sentry/react-native';

export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    integrations: [Sentry.reactNativeTracingIntegration()],
    enableAutoPerformanceTracing: true,
    enableAutoSessionTracking: true,
    environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
    beforeSend(event) {
      // Strip contexts that may contain PII
      if (event.contexts?.auth) delete event.contexts.auth;
      return event;
    },
  });
}

export { Sentry };
```

- [ ] **Step 4: Defer-call in `_layout.tsx` (per M4.4 pattern).** Inside the `useEffect` that fires after `InteractionManager.runAfterInteractions`:

```typescript
import { initSentry } from '@/lib/sentryInit';

// after setNotificationsReady(true);
initSentry();
```

- [ ] **Step 5: Verify green + smoke test in staging build.** Add a debug button that throws. Confirm error appears in Sentry.

### Task M5.3 — `usePlayerMetrics` hook

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/hooks/usePlayerMetrics.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { usePlayerMetrics, __resetMetricsForTest } from '@/hooks/usePlayerMetrics';

const emitSpy = jest.fn();
jest.mock('@/lib/analytics', () => ({
  analytics: { emit: emitSpy },
}));

function makeMockPlayer() {
  const listeners = new Map<string, (v?: unknown) => void>();
  return {
    status: 'idle',
    currentTime: 0,
    bufferedTime: 0,
    playbackRate: 1,
    addListener(event: string, cb: (v?: unknown) => void) { listeners.set(event, cb); return () => listeners.delete(event); },
    fireEvent(event: string, value?: unknown) { listeners.get(event)?.(value); },
  };
}

describe('usePlayerMetrics', () => {
  beforeEach(() => { emitSpy.mockClear(); __resetMetricsForTest(); });

  it('emits ttff after first successful frame', () => {
    const player = makeMockPlayer();
    const { rerender } = renderHook(({ player }) => usePlayerMetrics(player, 'reel-1'), {
      initialProps: { player },
    });

    // Simulate first frame ready event
    act(() => player.fireEvent('readyForDisplay'));

    const ttffCall = emitSpy.mock.calls.find(c => c[0] === 'ttff');
    expect(ttffCall).toBeDefined();
    expect(ttffCall![1]).toEqual(expect.objectContaining({ reelId: 'reel-1', durationMs: expect.any(Number) }));
  });

  it('emits rebuffer_start and rebuffer_end around buffering', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-2'));

    act(() => player.fireEvent('playbackStalled'));
    act(() => player.fireEvent('playbackStarted'));

    const events = emitSpy.mock.calls.map(c => c[0]);
    expect(events).toContain('rebuffer_start');
    expect(events).toContain('rebuffer_end');
  });

  it('emits bitrate_switch with old + new rung', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-3'));

    act(() => player.fireEvent('bitrateChange', { oldBitrate: 800000, newBitrate: 2500000 }));

    const switchCall = emitSpy.mock.calls.find(c => c[0] === 'bitrate_switch');
    expect(switchCall).toBeDefined();
    expect(switchCall![1]).toEqual(expect.objectContaining({ reelId: 'reel-3', oldBitrate: 800000, newBitrate: 2500000 }));
  });

  it('does not double-emit ttff within a session', () => {
    const player = makeMockPlayer();
    renderHook(() => usePlayerMetrics(player, 'reel-4'));

    act(() => player.fireEvent('readyForDisplay'));
    act(() => player.fireEvent('readyForDisplay'));

    const ttffEvents = emitSpy.mock.calls.filter(c => c[0] === 'ttff');
    expect(ttffEvents.length).toBe(1);
  });
});
```

- [ ] **Step 2: Implement analytics facade.** Create `apps/mobile/lib/analytics.ts`:

```typescript
import { Sentry } from './sentryInit';

type MetricName =
  | 'ttff'
  | 'rebuffer_start'
  | 'rebuffer_end'
  | 'bitrate_switch'
  | 'cold_start'
  | 'error';

interface MetricPayload {
  [key: string]: unknown;
}

export const analytics = {
  emit(name: MetricName, payload: MetricPayload = {}) {
    // Send as Sentry breadcrumb + custom measurement
    Sentry?.addBreadcrumb?.({
      category: 'perf',
      message: name,
      data: payload,
      level: 'info',
    });
    if (name === 'ttff' && typeof payload.durationMs === 'number') {
      Sentry?.setMeasurement?.('ttff', payload.durationMs, 'millisecond');
    } else if (name === 'cold_start' && typeof payload.durationMs === 'number') {
      Sentry?.setMeasurement?.('cold_start', payload.durationMs, 'millisecond');
    }
  },
};
```

- [ ] **Step 3: Implement hook.** Create `apps/mobile/hooks/usePlayerMetrics.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { analytics } from '@/lib/analytics';

// Module-level state for tests
const ttffFiredFor = new Set<string>();
export function __resetMetricsForTest() { ttffFiredFor.clear(); }

interface PlayerLike {
  addListener: (event: string, cb: (v?: unknown) => void) => () => void;
}

export function usePlayerMetrics(player: PlayerLike | null, reelId: string) {
  const startedAtRef = useRef<number>(Date.now());
  const rebufferStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!player) return;

    const offReady = player.addListener('readyForDisplay', () => {
      if (!ttffFiredFor.has(reelId)) {
        ttffFiredFor.add(reelId);
        const duration = Date.now() - startedAtRef.current;
        analytics.emit('ttff', { reelId, durationMs: duration });
      }
    });

    const offStall = player.addListener('playbackStalled', () => {
      if (rebufferStartRef.current === null) {
        rebufferStartRef.current = Date.now();
        analytics.emit('rebuffer_start', { reelId });
      }
    });

    const offResume = player.addListener('playbackStarted', () => {
      if (rebufferStartRef.current !== null) {
        const duration = Date.now() - rebufferStartRef.current;
        rebufferStartRef.current = null;
        analytics.emit('rebuffer_end', { reelId, durationMs: duration });
      }
    });

    const offBitrate = player.addListener('bitrateChange', (payload?: unknown) => {
      const p = payload as { oldBitrate?: number; newBitrate?: number } | undefined;
      analytics.emit('bitrate_switch', { reelId, oldBitrate: p?.oldBitrate, newBitrate: p?.newBitrate });
    });

    return () => {
      offReady();
      offStall();
      offResume();
      offBitrate();
    };
  }, [player, reelId]);
}
```

Note: the exact event names (`readyForDisplay`, `playbackStalled`, etc.) depend on expo-video's API. Verify against the actual expo-video 3.0.16 docs before implementation; rename to match the true event names if different.

- [ ] **Step 4: Wire into `reels.tsx`.** For the active reel's `ReelItem`, after creating the player:

```typescript
usePlayerMetrics(isActive ? player : null, item.id);
```

Only meter the active reel — metering all preloaded players skews the rebuffer data.

- [ ] **Step 5: Verify green.**

### Task M5.4 — CloudWatch alarms (JSON + CLI)

- [ ] **Step 1: Document alarm JSON.** Create `apps/api/docs/cloudwatch-alarms.json`:

```json
{
  "Alarms": [
    {
      "AlarmName": "eru-mediaconvert-queue-depth",
      "MetricName": "JobsQueued",
      "Namespace": "AWS/MediaConvert",
      "Statistic": "Maximum",
      "Period": 60,
      "EvaluationPeriods": 5,
      "Threshold": 50,
      "ComparisonOperator": "GreaterThanThreshold",
      "TreatMissingData": "notBreaching",
      "Comment": "Warn when MediaConvert queue has >50 jobs for 5 minutes"
    },
    {
      "AlarmName": "eru-mediaconvert-queue-depth-critical",
      "MetricName": "JobsQueued",
      "Namespace": "AWS/MediaConvert",
      "Statistic": "Maximum",
      "Period": 60,
      "EvaluationPeriods": 5,
      "Threshold": 200,
      "ComparisonOperator": "GreaterThanThreshold",
      "TreatMissingData": "notBreaching"
    },
    {
      "AlarmName": "eru-mediaconvert-job-failure-rate",
      "MetricName": "JobsErroredCount",
      "Namespace": "AWS/MediaConvert",
      "Statistic": "Sum",
      "Period": 300,
      "EvaluationPeriods": 1,
      "Threshold": 5,
      "ComparisonOperator": "GreaterThanThreshold",
      "TreatMissingData": "notBreaching",
      "Comment": "5 failures in 5 minutes = warn"
    },
    {
      "AlarmName": "eru-cloudfront-cache-hit-ratio-low",
      "MetricName": "CacheHitRate",
      "Namespace": "AWS/CloudFront",
      "Statistic": "Average",
      "Period": 300,
      "EvaluationPeriods": 3,
      "Threshold": 85,
      "ComparisonOperator": "LessThanThreshold",
      "TreatMissingData": "notBreaching"
    }
  ]
}
```

- [ ] **Step 2: Apply via CLI.**

```bash
# Example for one alarm; loop through all in the JSON
aws cloudwatch put-metric-alarm \
  --alarm-name eru-mediaconvert-queue-depth \
  --metric-name JobsQueued \
  --namespace AWS/MediaConvert \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 5 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching \
  --alarm-actions <sns-topic-arn-for-alerts> \
  --region ap-south-1
```

- [ ] **Step 3: 48-hour silent mode.** After creation, set `--alarm-actions` to a low-priority SNS topic (or none) for 48 hours while baselines establish. Then rebind to the paging topic.

### Task M5.5 — Alert routing (Slack / email)

- [ ] **Step 1: Create SNS topic.**

```bash
aws sns create-topic --name eru-perf-alerts --region ap-south-1
```

- [ ] **Step 2: Email subscription.**

```bash
aws sns subscribe \
  --topic-arn <topic-arn> \
  --protocol email \
  --notification-endpoint tjabraham1@gmail.com \
  --region ap-south-1
# Founder must click the confirmation email
```

- [ ] **Step 3: Slack integration (optional — Slack webhook URL).**

Slack → Incoming Webhooks → create a webhook for `#eru-perf-alerts`. Then create a Lambda that receives SNS and POSTs to Slack, or use AWS Chatbot (native Slack integration).

Simplest: AWS Chatbot via console (no code needed).

### Task M5.6 — CloudWatch dashboard

- [ ] **Step 1: Define dashboard JSON.** Create `apps/api/docs/cloudwatch-dashboard.json`:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [["AWS/MediaConvert", "JobsQueued"]],
        "period": 300,
        "stat": "Maximum",
        "region": "ap-south-1",
        "title": "MediaConvert queue depth"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [["AWS/MediaConvert", "JobsCompletedCount"], ["AWS/MediaConvert", "JobsErroredCount"]],
        "period": 300,
        "stat": "Sum",
        "region": "ap-south-1",
        "title": "MediaConvert completions vs errors"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [["AWS/CloudFront", "CacheHitRate"]],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "CloudFront cache hit ratio"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [["AWS/CloudFront", "Requests"]],
        "period": 300,
        "stat": "Sum",
        "region": "us-east-1",
        "title": "CloudFront requests/5min"
      }
    }
  ]
}
```

- [ ] **Step 2: Apply.**

```bash
aws cloudwatch put-dashboard \
  --dashboard-name Eru-Perf \
  --dashboard-body file://apps/api/docs/cloudwatch-dashboard.json \
  --region ap-south-1
```

- [ ] **Step 3: Verify.** Open the dashboard in the AWS console. Each widget should populate within ~10 min.

### Task M5.7 — API-side custom metric: MediaConvert queue depth from our perspective

- [ ] **Step 1: Failing test.** Create `apps/api/tests/utils/metrics.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { emitGauge } from '../../src/utils/metrics.js';
import * as Sentry from '@sentry/node';

const setMeasurementSpy = vi.spyOn(Sentry, 'setMeasurement' as keyof typeof Sentry);

describe('metrics.emitGauge', () => {
  it('calls Sentry.setMeasurement with the given name + value', () => {
    emitGauge('pending_transcodes', 7);
    expect(setMeasurementSpy).toHaveBeenCalledWith('pending_transcodes', 7, 'none');
  });
});
```

- [ ] **Step 2: Implement.** Create `apps/api/src/utils/metrics.ts`:

```typescript
import * as Sentry from '@sentry/node';

export function emitGauge(name: string, value: number, unit: string = 'none'): void {
  const anySentry = Sentry as unknown as { setMeasurement?: (n: string, v: number, u: string) => void };
  anySentry.setMeasurement?.(name, value, unit);
}
```

- [ ] **Step 3: Cron implementation.** Create `apps/api/src/jobs/metricsCron.ts`:

```typescript
import cron from 'node-cron';
import { prisma } from '../utils/prisma.js';
import { emitGauge } from '../utils/metrics.js';

export function registerMetricsCron() {
  cron.schedule('* * * * *', async () => {
    try {
      const pending = await prisma.contentMedia.count({ where: { type: 'video', transcodeStatus: 'processing' } });
      const failed = await prisma.contentMedia.count({ where: { type: 'video', transcodeStatus: 'failed' } });
      emitGauge('transcode_pending', pending);
      emitGauge('transcode_failed', failed);
    } catch (err) {
      console.error('[metricsCron] error', err);
    }
  });
}
```

- [ ] **Step 4: Register** alongside existing crons in server startup.

- [ ] **Step 5: Verify green.**

## 7. Answer to "what measurements tell us we're fast enough"

Ship M5 with thresholds set at "warning = acceptable launch floor":

- TTFF p75 <1.5s on 4G (from usePlayerMetrics)
- Rebuffer ratio <1% (from usePlayerMetrics)
- Cold start p95 <2s (from M4.2 hook)
- API p95 `/feed` <200ms (from Sentry Performance)

When all four green for 7 consecutive days → "fast enough for Kerala pilot."

## 8. Answer to "what tells us we still need more"

After 30 days of field data:

- Rebuffer ratio persistently >3% → need peer-to-peer chunk sharing (services like Peer5) OR more aggressive pre-warming OR CMAF low-latency chunks OR a second CDN (Fastly fallback).
- TTFF p95 >3s persistent → investigate: is ABR picking too high a rung initially? Is Origin Shield actually helping? Trigger M3.6 audit.
- MediaConvert queue backlog >30min regularly → request AWS limit increase OR buy a reserved queue ($400/month for 5 reserved slots) OR move to serverless SVT-AV1 transcoding on EC2 spot.
- CDN egress >$500/month → negotiate CloudFront commitment pricing OR evaluate Fastly/BunnyCDN.

## 9. What could go wrong

- **Sentry ingest spike on first deploy.** If every mobile session on a buggy version throws, we burn our monthly event quota in days. **Mitigation:** per-user sample rates (`tracesSampleRate: 0.1`) and an error budget. Start at 10% sample for non-error events.
- **CloudWatch alarm noise.** Day-1 alarms firing because a baseline isn't established. **Mitigation:** 48-hour "silent mode" where alarms log to a channel but don't page anyone.
- **Observability PII leakage.** Sentry breadcrumbs could capture user phone numbers from `/auth/otp` requests. **Mitigation:** `beforeSend` in Sentry init strips request bodies on auth routes (shown in M5.1 code).
- **Mobile `usePlayerMetrics` event-names wrong.** expo-video's specific listener event names may differ. **Mitigation:** tests use a fake emitter; live verification happens on staging by tailing Sentry.
- **Metrics cron hammers the DB.** 1 query/minute × 2 counts is trivial but doubles with other metrics. **Mitigation:** one query with `groupBy` instead of two counts.

## 10. Rollback

- Sentry: remove the `Sentry.init` calls; rebuild. Data already captured is fine to keep.
- CloudWatch alarms: disable via `aws cloudwatch disable-alarm-actions --alarm-names ...`.
- Metrics cron: comment out `registerMetricsCron()` in server startup.

No data loss.

## 11. Cost delta

- Sentry free tier: 5,000 errors + 10,000 transactions per month. Likely insufficient once live; Team plan at $26/month. Plan for ~$30.
- CloudWatch: free tier covers <10 alarms + basic metrics. Custom metrics: $0.30 per metric per month × ~15 custom metrics = **~$5/month**.
- **Net M5 delta: ~$35/month.**

## 12. Duration

- M5.1 + M5.2 (Sentry init): 4–6 hours
- M5.3 (player metrics): 6–8 hours (subtle state tracking)
- M5.4 + M5.5 (CloudWatch + alerts): 4–6 hours
- M5.6 (dashboard): 2–3 hours
- M5.7 (API metrics cron): 2–3 hours
- Field-validation of thresholds: 1–2 days of waiting for real data
- **Total:** 18–26 hours + 1–2 days wait = **2–3 working days of active work.**

## 13. Dependencies

- Strongly recommended alongside every prior milestone, but formally standalone.
- Parallel with M2, M3, M4.

## 14. Wrapping up the Option-C overhaul

Once M0–M5 have shipped and thresholds have been green for 7 consecutive days on real Kerala-pilot traffic, the streaming overhaul is complete. Any further work (CMAF migration, peer-to-peer chunk sharing, 4K, DRM) becomes a *new* plan — not a M6.

At that point, close the loop: create a "SpeedOptimization-retrospective.md" in this folder noting actual durations vs estimates, surprises encountered, and numbers achieved vs thresholds. Future plans benefit from that honesty.
