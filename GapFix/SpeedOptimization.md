# SpeedOptimization — Video Streaming & Performance Overhaul (Option C)

> **For agentic workers:** REQUIRED SUB-SKILLS per milestone: `superpowers:executing-plans`, `superpowers:test-driven-development`, optionally `superpowers:systematic-debugging` for HLS/streaming bugs. TDD rules are in Section 7 below. Each milestone has its own `.md` file in `GapFix/SpeedOptimization/` — read the index (this file) first, then open the milestone you're working on.

**Goal:** Take the Eru video pipeline from "dormant MediaConvert + raw-original served to every viewer" to "TikTok-grade HLS with edge caching, preloading, and observability" through six independently shippable milestones.

**Architecture:** MP4 variants first (M0), then HLS migration (M1), then CDN/preload/bundle/monitoring in parallel (M2–M5). Each milestone ships value on its own — you can stop after any of them and still have a better product than the starting state.

**Tech stack additions:** `@sentry/node`, `@sentry/react-native` (M5), `@react-native-community/netinfo` (M3). No new managed services beyond what's already used (Upstash Redis, CloudFront, MediaConvert, S3).

---

## 1. Context

**Problem:** Founder testing on a Galaxy S24 + home wifi still feels laggy in five places: (A) first reel slow to appear, (B) swipe-between-reels stutters, (C) tap-into-reel-from-Explore delays, (D) cold start sluggish, (E) home feed scroll slow. Bandwidth is not the bottleneck — architecture is.

**Root cause investigation confirmed by reading code:**

| Claim | Evidence | Verdict |
|---|---|---|
| MediaConvert pipeline uses progressive MP4 (no HLS) | `apps/api/src/services/transcodeService.ts:49–52, 77` | TRUE |
| `triggerTranscode` declared but **never called** | Grep across `apps/api/src/` shows zero call sites; `apps/api/src/routes/content.ts:13–100` creates content without calling transcode | TRUE — DEAD CODE |
| `handleTranscodeComplete` has **no webhook route** | `apps/api/src/app.ts:84–108` registers 25 route groups, zero MediaConvert/SNS/EventBridge handlers | TRUE — NEVER INVOKED |
| Mobile reads `originalUrl` only | `apps/mobile/app/(tabs)/reels.tsx:55`, `apps/mobile/components/PostCard.tsx:42–44` | TRUE |
| Seeded data hides the bug | `apps/api/src/scripts/seed-reels.ts:102–114` comment explicitly says "MediaConvert is deferred"; `fix-reel-urls.ts:44–51` hardcodes the same URL into all variant columns | TRUE |
| Feed fetches 200, scores in JS, paginates after | `apps/api/src/services/feedAlgorithm.ts:199–253` + no Redis cache for feed | TRUE |
| No reel preload | `reels.tsx:71–78` gates playback on `isActive`; neighbours render but don't warm | TRUE |
| No tab lazy-loading | `apps/mobile/app/(tabs)/_layout.tsx:20–39` eagerly declares all five tabs | TRUE |
| Hermes confirmed enabled | `apps/mobile/app.json` has no `jsEngine` key | **FALSE** — needs explicit enablement |
| No Sentry anywhere | Neither `apps/api/package.json` nor `apps/mobile/package.json` depends on Sentry | TRUE |

**Why this plan exists now:** Real Indian 4G users on mid-range Androids will feel this ten times worse than a S24 on wifi. Option C is a phased migration to TikTok-grade streaming that ships value at every milestone rather than one 3-week monolith.

**Success criteria (the numbers we're committing to):**

- Time-to-first-frame (TTFF) p75 under 1.5s on 4G, under 500ms on wifi
- Rebuffer ratio under 1% of playback time
- Cold start to first interactive screen under 2s on mid-range Android
- Feed scroll stays at 60fps (no dropped frames) while scrolling
- Reel swipe latency under 50ms (finger-down to active-reel-change)
- API p95 for `/feed` under 200ms, `/content/:id` under 400ms

---

## 2. The broken-dumbwaiter analogy

A restaurant kitchen called MediaConvert has every tool it needs — ovens that render at 360p/720p/1080p, a head chef (`transcodeService.ts`) with the full recipe. But two critical pieces are missing: **the dumbwaiter that carries finished plates from kitchen to dining room is not installed** (no `triggerTranscode()` call site — orders never reach the kitchen), and **the bell that rings when food is ready is not wired to the waitstaff** (no webhook — even if the kitchen finished cooking, no one knows). So every customer is served raw ingredients straight off the chopping board (`originalUrl`), regardless of what the menu promised.

The six milestones continue this analogy:

- **M0** — Install the dumbwaiter and the kitchen bell. Give the waitstaff a clipboard that says "check the warmer shelf before reaching for the chopping board" (the mobile URL helper).
- **M1** — Replace whole roast chickens (progressive MP4) with microwave-ready tapas plates (HLS segments). Diners get their first bite within seconds instead of waiting for the whole bird.
- **M2** — Pre-position the tapas plates at a food truck outside every neighbourhood (CloudFront edge locations across India) instead of running each order from the main kitchen.
- **M3** — Pre-plate the next two courses before the diner finishes the current one (reel preload). Keep a rotating tray of today's specials ready (Redis feed cache).
- **M4** — Fix the wobbly table leg (bundle size) and streamline the menu cards (lazy tab loading) so customers sit down faster.
- **M5** — Install cameras in the kitchen and dining room so we can actually see where the delays are (Sentry + CloudWatch + HLS ABR metrics).

**Key insight:** Milestones M0 and M1 are the kitchen-and-dumbwaiter work. M2–M5 are dining-room experience. You cannot fix the dining room before the kitchen works.

---

## 3. Architecture diagrams (ASCII)

### 3.1 Current (broken) data flow

```
┌──────────┐        POST /content/create        ┌──────────────┐
│  Mobile  │  ───────────────────────────────▶  │ content.ts   │
└──────────┘                                    │  :13–100     │
                                                └──────┬───────┘
                                                       │
                                              creates DB row + media
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ contentMedia    │
                                              │  originalUrl: ✓ │
                                              │  video*pUrl: ✗  │   ← never populated
                                              │  status: pending│
                                              └─────────────────┘

                   triggerTranscode(...)  ← DECLARED, NEVER CALLED
                                      │
                                      ▼
                              ┌──────────────┐
                              │ MediaConvert │    ← NEVER FIRED
                              └──────┬───────┘
                                     │
                                     ▼
                              SNS/EventBridge      ← NO SUBSCRIPTION
                                     │
                                     ▼
                  handleTranscodeComplete(...)  ← NEVER INVOKED

┌──────────┐        GET /feed                  ┌──────────────┐
│  Mobile  │  ───────────────────────────────▶ │ feedAlgo     │
└──────────┘                                   │  fetch 200   │
                                               │  score in JS │
                                               │  slice       │
                                               └──────┬───────┘
                                                      │
                               reels.tsx:55 reads item.media[0].originalUrl
                                                      │
                                                      ▼
                               ┌─────────────────────────────┐
                               │  180 MB raw .mov plays      │
                               │  (or silently fails)        │
                               └─────────────────────────────┘
```

### 3.2 After M0 (pipeline wired, MP4 variants served)

```
┌──────────┐     POST /content/create       ┌──────────────┐
│  Mobile  │  ─────────────────────────────▶│ content.ts   │
└──────────┘                                 │  modified    │
                                             └──────┬───────┘
                                                    │
                                  creates row + calls triggerTranscode(mediaId, s3Key)
                                                    │
                                                    ▼
                                        ┌──────────────────────┐
                                        │ MediaConvert job     │
                                        │ outputs: 360p/720p/  │
                                        │          1080p MP4   │
                                        └──────────┬───────────┘
                                                   │
                                                   ▼
                              ┌──────────────────────────────────┐
                              │ EventBridge rule captures state  │
                              │ change event, POSTs to API       │
                              │ POST /webhooks/mediaconvert      │
                              └───────────────────┬──────────────┘
                                                  │
                                                  ▼
                                    handleTranscodeComplete(...)
                                                  │
                                                  ▼
                              ┌──────────────────────────────────┐
                              │ contentMedia UPDATE              │
                              │  video360pUrl = cdn/.../_360p.mp4│
                              │  video720pUrl = cdn/.../_720p.mp4│
                              │  video1080pUrl = cdn/.../_1080p..│
                              │  status = complete               │
                              └──────────────────────────────────┘

┌──────────┐     GET /feed                   ┌──────────────┐
│  Mobile  │  ─────────────────────────────▶ │ feedAlgo     │
└──────────┘                                 └──────┬───────┘
                                                    │
                       reels.tsx now calls pickVideoUrl(media) from @eru/shared
                                                    │
                      pickVideoUrl order: hlsManifest > 720p > 360p > original
                                                    │
                                                    ▼
                               ┌─────────────────────────────┐
                               │  ~3 MB 720p MP4 plays       │
                               │  (first-frame ~2s on 4G)    │
                               └─────────────────────────────┘
```

### 3.3 After M1 (HLS migration)

```
MediaConvert HLS_GROUP_SETTINGS
     │
     ├── master.m3u8            (video-on-demand master manifest)
     ├── 240p.m3u8 + 240p_*.ts  (slow-4G rung, ~400 kbps)
     ├── 360p.m3u8 + 360p_*.ts  (~800 kbps)
     ├── 540p.m3u8 + 540p_*.ts  (~1.4 Mbps)
     ├── 720p.m3u8 + 720p_*.ts  (~2.5 Mbps)
     └── 1080p.m3u8 + 1080p_*.ts (~5 Mbps, wifi only)

ContentMedia gains `hlsManifestUrl` column (nullable).
pickVideoUrl returns hlsManifestUrl first if present → expo-video uses native ABR.
Legacy content continues serving MP4 variants (nullable HLS column means "HLS not available").
```

### 3.4 Final (after M0–M5)

```
┌────────────────────────────────────────────────────────────────────┐
│ MOBILE                                                             │
│  - Hermes engine                                                   │
│  - Lazy-loaded tabs (only active tab code bundled at cold start)   │
│  - Reels: preload N+1, N+2, N-1; evict N-2                         │
│  - Bandwidth-aware preload (2 reels on 2G, 3 on 3G, 5 on wifi)     │
│  - Sentry Performance: TTFF, rebuffer, frame drops, cold start     │
└───────────────────────┬────────────────────────────────────────────┘
                        │
                        │ HLS manifests + segments
                        ▼
┌────────────────────────────────────────────────────────────────────┐
│ CLOUDFRONT (ap-south-1 + 4 Indian edges)                           │
│  - Origin Shield in Mumbai (cache consolidation)                   │
│  - 10s TTL on *.m3u8 manifest                                      │
│  - 7 day TTL on *.ts segments                                      │
│  - Brotli on manifests, segments already binary                    │
│  - HTTP/2; HTTP/3 evaluated in M5                                  │
│  - Trending content pre-warmed via Lambda cron hitting each edge   │
└───────────────────────┬────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────┐
│ S3 + MediaConvert (ap-south-1)                                     │
│  - HLS 5-rung ladder, 4s segments                                  │
│  - EventBridge → POST /webhooks/mediaconvert → DB update           │
│  - CloudWatch alarm on queue backlog, failed jobs, cost guardrail  │
└───────────────────────┬────────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────────┐
│ API (Railway)                                                      │
│  - /feed cached 60s per-user in Upstash Redis                      │
│  - /trending cached 300s cross-user                                │
│  - Sentry Performance: p50/p95/p99 per route, DB query time        │
│  - Prisma selects trimmed (sparse fieldsets per route)             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Milestone map

| # | Name | Ships | Duration | Blocks | Parallel-with |
|---|------|-------|----------|--------|---------------|
| M0 | Pipeline wiring + mobile URL helper + backfill | MP4 variants actually reach the app | 3–4 days | M1 | — |
| M1 | HLS migration | Adaptive bitrate streaming | 5–7 days | M2 | — |
| M2 | CDN edge optimization | Lower latency, India-edge caching | 3–4 days | — | M3, M4, M5 |
| M3 | Preloading + Redis caching | Swipe-zero-delay, feed-API offload | 4–5 days | — | M2, M4, M5 |
| M4 | Startup + bundle | Cold start <2s, smaller download | 3–4 days | — | M2, M3, M5 |
| M5 | Performance monitoring | Evidence the work landed | 2–3 days (core) + ongoing instrumentation | — | M2, M3, M4 |

**Honest total calendar estimate:** 4–6 weeks elapsed if shipped sequentially by one agent. 2.5–3.5 weeks elapsed if M2/M3/M4/M5 run concurrently after M1.

**Critical path:** M0 → M1 is strict. Nothing in M2–M5 is valuable until HLS exists.

**Recommendation for the founder monitoring progress:** Ship M0 first (days, not weeks). Validate on a Jio network in Kerala before starting M1. Ship M1 next. Only then evaluate if M2/M3/M4 are still the right follow-ups — or if field data changes priorities.

---

## 5. Dependency graph

```
      ┌─── M0 ───┐
      │  (3-4 d) │
      └────┬─────┘
           │ must complete first
           ▼
      ┌─── M1 ───┐
      │  (5-7 d) │
      └────┬─────┘
           │ must complete before any of M2/M3 (they assume HLS)
           │
   ┌───────┼───────┬─────────────┐
   ▼       ▼       ▼             ▼
  M2      M3      M4            M5
 CDN    Preload  Bundle     Monitoring
(3-4d)  (4-5d)  (3-4d)      (2-3d core,
                              continuous)

   — M5 SHOULD ship incrementally alongside M0–M4; formalised as own milestone
     so the monitoring infra (Sentry project, CloudWatch dashboards, alert
     thresholds) has a dedicated spec rather than being scattered. —
```

**What runs in parallel after M1:** M2, M3, M4, M5 touch different layers (CDN vs mobile preload vs bundle vs observability) with no shared state. A single agent working sequentially is fine; two agents could take M2/M3 in parallel with minimal merge risk.

**What does NOT parallelise:**

- M0 and M1 share `transcodeService.ts`, `schema.prisma` (hlsManifestUrl column addition), and `routes/webhooks.ts`.
- M3 adds a `pickVideoUrl` branch for HLS preload that depends on M1's HLS schema.
- M5's MediaConvert CloudWatch alerts need M1's HLS job metrics to be emitted.

---

## 6. Glossary

| Term | Plain-English meaning |
|---|---|
| **HLS (HTTP Live Streaming)** | Apple's adaptive video format: a text file called a `.m3u8` manifest that lists small `.ts` video chunks. The player downloads the manifest, then streams one chunk at a time, switching quality mid-playback based on bandwidth. Think "Netflix Lite." |
| **CMAF (Common Media Application Format)** | A newer adaptive format where chunks are fragmented `.mp4` instead of `.ts`. Works with both HLS and DASH manifests, so a single encode supports both. Main benefit is low-latency LIVE; for VOD (video on demand, pre-recorded), the win over HLS is marginal. |
| **ABR (Adaptive Bitrate)** | The player's ability to switch between quality levels mid-video. 720p on wifi, 360p when the train enters a tunnel. The whole point of HLS/CMAF. |
| **Bitrate ladder** | The set of quality rungs a video is encoded at. Eru's plan: 240p / 360p / 540p / 720p / 1080p, with kilobit-per-second targets for each. |
| **Segment duration** | How long each `.ts` chunk represents. 4s means the player downloads a new chunk every 4s. Short segments = faster first frame but more requests. Long segments = fewer requests but slower startup. |
| **m3u8** | The text manifest file. Master manifest lists variants; each variant has its own m3u8 listing the `.ts` segments and their durations. |
| **.ts segment** | MPEG-2 Transport Stream chunk, usually 2–10 seconds of video+audio. Named like `720p_00001.ts`, `720p_00002.ts`. |
| **CDN (Content Delivery Network)** | A network of edge servers that cache content closer to users. CloudFront has ~8 edge locations in India (Mumbai, Hyderabad, Chennai, Bangalore, Delhi, Kolkata, and more). |
| **Origin Shield** | A CloudFront feature that inserts an additional cache layer in one specific region (Mumbai for us) that all edge locations talk to, reducing redundant S3 fetches. |
| **TTFF (Time-To-First-Frame)** | How long from the moment a user taps play until the first frame renders. The single most important perceived-performance metric. |
| **Rebuffer** | When playback pauses mid-video because the next chunk isn't ready. Rebuffer ratio = (rebuffer time) / (total playback time). |
| **TTL (Time-To-Live)** | How long a CDN or cache keeps a response before going back to the origin. Short TTL = fresh data but more origin load. Long TTL = less origin load but stale data. |
| **EventBridge** | AWS's event bus. Services like MediaConvert publish state-change events to it; rules can forward them to SQS, Lambda, or HTTP endpoints (our API webhook). |
| **Redis** | In-memory key-value store used here for rate-limiting (already), feed caching (M3 new), and trending content (M3 new). Upstash is the hosted version already set up. |
| **Hermes** | A JavaScript engine optimised for React Native apps. Faster startup than JSC (the default). Enabled per-platform in `app.json` — currently NOT explicitly set in Eru. |

---

## 7. TDD Protocol (agent-first)

> This protocol mirrors `GapFix/GapFixP0.md#tdd-protocol` with streaming-specific additions. **Agents executing any milestone below MUST follow this protocol.** No exceptions.

### 7.1 Core loop (red → green → refactor)

For every task in every milestone:

1. **RED — write the failing test first.** Paste the test into the correct location. Run it. It must fail for the *right* reason: symbol undefined, function not called, DB column missing, etc. If it fails for a *wrong* reason (syntax error, wrong import path), fix the test before the implementation.
2. **GREEN — write the minimum code to pass the test.** No extra validation, no speculative branches, no error handling beyond what the test asserts.
3. **REFACTOR — clean up while tests stay green.** Extract duplication, rename for clarity, inline one-use helpers. Re-run the full file's tests after every tweak.

### 7.2 Invocation

At the start of each milestone session, invoke:

```
Skill: superpowers:test-driven-development
Skill: superpowers:executing-plans
```

For multi-task milestones where independent tasks can run in parallel:

```
Skill: superpowers:subagent-driven-development
```

For debugging a red test that fails for the wrong reason:

```
Skill: superpowers:systematic-debugging
```

For post-milestone review:

```
Skill: superpowers:verification-before-completion
Skill: superpowers:requesting-code-review
```

### 7.3 API tests (Vitest)

**Location:** `apps/api/tests/routes/*.test.ts` or `apps/api/tests/services/*.test.ts`.

**Run:** `ALLOW_DEV_TOKENS=true npm test -- <pattern>` from inside `apps/api`.

**Rules from `apps/api/CLAUDE.md`:**

- All seeded users MUST have `firebaseUid` starting with `dev-test-` + a unique per-test suffix. See `tests/helpers/db.ts`.
- New models that reference users MUST be added to `cleanupTestData` in FK-safe order. Miss this → full-suite P2003 violations.
- Don't mock Prisma. Hit the real Supabase dev DB. That's what `fileParallelism: false` is for.

**Streaming-specific helpers introduced by M0/M1:**

```typescript
// apps/api/tests/helpers/streaming.ts (NEW — M0 creates this)

/** Build a fake MediaConvert EventBridge completion payload for a given mediaId. */
export function fakeMediaConvertCompletionEvent(mediaId: string, outputPrefix: string) { /* ... */ }

/** Build a fake MediaConvert failure event. */
export function fakeMediaConvertFailureEvent(mediaId: string, errorCode: string) { /* ... */ }

/** Seed a ContentMedia row with transcodeStatus='processing' and no variant URLs. */
export async function seedPendingVideoMedia(opts: { userId: string; contentId?: string }) { /* ... */ }
```

### 7.4 Mobile tests (Jest / jest-expo)

**Location:** `apps/mobile/__tests__/**` mirroring the `app/` + `components/` structure.

**Run:** `npm test -- <pattern>` from inside `apps/mobile`.

**Rules from `apps/mobile/CLAUDE.md`:**

- Default API import: `import api from '@/services/api'`, not `{ api }`.
- Firebase, expo-notifications, expo-image-picker — each test file that renders a screen using them must mock them explicitly.
- Expo Router mocks:
  ```typescript
  jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  }));
  ```

**Streaming-specific helpers introduced by M0:**

```typescript
// apps/mobile/__tests__/helpers/media.ts (NEW — M0 creates this)

/** Build a ContentMedia object with the specified variants present. */
export function buildMedia(opts: {
  original?: string;
  p360?: string;
  p720?: string;
  p1080?: string;
  hlsManifest?: string;
}): ContentMedia { /* ... */ }

/** Mock expo-video's useVideoPlayer + VideoView with spy-able controls. */
export function mockExpoVideo() { /* ... */ }
```

### 7.5 Shared package tests

**Location:** `packages/shared/src/**/*.test.ts`.

**Run:** `npm test` from inside `packages/shared` (Vitest).

`@eru/shared` tests are pure-function tests — no DB, no network. Keep them lightweight.

### 7.6 Test coverage gates (per milestone)

A milestone is not shippable until:

- Every new function has at least one test that would fail without the implementation.
- Every new route has a happy-path test + at least one error-path test.
- Every new mobile component has at least one render test + one interaction test.
- Full test suite runs green for both apps: `cd apps/api && ALLOW_DEV_TOKENS=true npm test && cd ../mobile && npm test`.
- Type-check is green: `npx tsc --noEmit` in each workspace (aside from the 6 pre-existing errors documented in `CLAUDE.md`).

### 7.7 Why this protocol matters

Without it, streaming bugs are the worst kind: they pass all smoke tests on a fast network, then fail at scale on real user devices. Red-green tests pinned to explicit network and DB states let you reproduce "the S24 works but a Redmi on Jio buffers" deterministically, six months from now, in CI.

---

## Navigation

- [M0 — Pipeline wiring + mobile URL helper + backfill](SpeedOptimization/M0-pipeline-wiring.md)
- [M1 — HLS migration](SpeedOptimization/M1-hls-migration.md)
- [M2 — CDN edge optimization](SpeedOptimization/M2-cdn-edge.md)
- [M3 — Preloading + Redis caching](SpeedOptimization/M3-preloading-caching.md)
- [M4 — App startup + bundle](SpeedOptimization/M4-startup-bundle.md)
- [M5 — Performance monitoring](SpeedOptimization/M5-monitoring.md)
- [Answers to the 8 specific questions](SpeedOptimization/answers.md)
- [Known unknowns](SpeedOptimization/known-unknowns.md)
