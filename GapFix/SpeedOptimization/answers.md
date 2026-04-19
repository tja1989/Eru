# Answers to the 8 Specific Questions

> Decisions committed to in this plan. Challenge them only with evidence (field data, cost numbers, or a specific failure mode).

## 1. HLS vs CMAF — which and why for Eru's stack and audience?

**HLS** for MVP.

**Why:** `expo-video`'s ExoPlayer (Android) and AVPlayer (iOS) have years of HLS hardening on low-end devices; MediaConvert's `HLS_GROUP_SETTINGS` is better-documented than `CMAF_GROUP_SETTINGS`; CMAF's main advantages (single-encode-dual-manifest, low-latency LIVE) don't apply to Eru's VOD use case.

**Revisit trigger:** 3 months after M1 ships, if (a) field data shows persistent rebuffer issues Android-side, (b) we decide to ship DASH alongside HLS (e.g., for a web reels viewer), or (c) we add LIVE streaming (LL-HLS or LL-DASH would use CMAF).

See [M1 §4 (HLS vs CMAF decision)](M1-hls-migration.md#4-hls-vs-cmaf--decision-and-reasoning).

---

## 2. Segment duration — with reasoning

**4 seconds.**

- 2s produces too many CDN requests at scale — higher cost plus connection-setup overhead per request.
- 6s makes TTFF slow (~1.8s vs 1.2s at 4s).
- 4s is the industry default for VOD (Netflix, YouTube, Instagram all use 4–6s for on-demand; 2s is low-latency LIVE territory).

GOP size is set to 96 frames (4s × 24fps) so every segment starts on an I-frame, enabling seamless ABR switches.

See [M1 §6 (segment duration decision)](M1-hls-migration.md#6-segment-duration--decision).

---

## 3. Bitrate ladder — exact rungs with reasoning

**5 rungs.** Audio is a single AAC 128 kbps track alongside the ladder.

| Rung | Resolution | Video bitrate | Target network | Reason included |
|---|---|---|---|---|
| 240p | 426 × 240 | 400 kbps | Peak-hour Jio/Airtel 4G | Without this rung, ABR gives up and rebuffers when bandwidth dips below ~500 kbps. Non-negotiable for India. |
| 360p | 640 × 360 | 800 kbps | Regular 4G | Existing rung; kept |
| 540p | 960 × 540 | 1,400 kbps | Fast 4G | New rung. Prevents ABR thrashing between 360 and 720 on fluctuating networks |
| 720p | 1280 × 720 | 2,500 kbps | Wifi or 5G | Existing rung; kept as default |
| 1080p | 1920 × 1080 | 5,000 kbps | Wifi only | Opt-in via `pickVideoUrl(media, { allow1080p: true })` — burns data on 4G |

**Why not 4K:** Mobile displays top out at 1080p. Zero visual benefit, doubled CDN cost.

See [M1 §5 (bitrate ladder decision)](M1-hls-migration.md#5-bitrate-ladder--decision).

---

## 4. expo-video adequacy vs react-native-video swap

**Keep expo-video 3.0.16.** Migrate to react-native-video **only** if all three triggers fire:

1. Sentry data shows ABR consistently picks too-high a bitrate initially (seen as abr_switch_down events clustered at first segment boundary).
2. Cache-eviction control becomes a bottleneck (e.g., we need to cap offline storage).
3. We add DRM or mid-roll ads (Phase 3+ features).

Migration cost when it happens: **1–2 days**, because `pickVideoUrl` already abstracts the URL source. The `usePlayerMetrics` hook would need rewriting against react-native-video's event names.

See [M1 §7 (expo-video vs react-native-video)](M1-hls-migration.md#7-expo-video-vs-react-native-video--decision).

---

## 5. How to handle the migration period when some videos are MP4 and some are HLS

**Dual-serve via `pickVideoUrl(media)`.**

Selection priority:

```
hlsManifestUrl  →  video720pUrl (or 1080p if allow1080p) →  video540pUrl  →  video360pUrl  →  video240pUrl  →  originalUrl
```

Webhook (`/webhooks/mediaconvert`) handles both event shapes:

- `HLS_GROUP` → populates `hlsManifestUrl` + all variant `.m3u8` URLs
- Legacy `FILE_GROUP` (MP4) → populates `video360pUrl` / `video720pUrl` / `video1080pUrl` + leaves `hlsManifestUrl` null

New uploads after M1 ships produce HLS only. Old MP4-only content keeps serving until it's backfilled via `backfill-hls.ts` or naturally deleted.

See [M1 §10 (what could go wrong — master manifest 404 fallback)](M1-hls-migration.md#10-what-could-go-wrong) and [M0.1 `pickVideoUrl` implementation](M0-pipeline-wiring.md#task-m01--pickvideourl-shared-helper).

---

## 6. Cache invalidation — TTL vs event-driven

**Pure TTL for v1.** 60s on per-user feed, 300s on trending cross-user cache, 10s on HLS manifest (CloudFront), 7 days on HLS segments (CloudFront).

**Why TTL is sufficient:**

- 60s staleness is human-imperceptible for feed.
- Event-driven (Redis pub/sub on `publish`/`like`/`follow`) adds failure modes (pub/sub down → stale cache forever, missing unsubscribe calls → memory leaks).
- Eru's scale lets us run on TTL for 6–12 months without visible issues.

**Revisit trigger:** when the first creator exceeds ~100K followers (a like cascades to tens of thousands of feeds) or when we add real-time ads (budget depletion must show live).

Manual bust exists via `POST /admin/feed-cache/invalidate/:userId` for moderation + emergencies.

See [M3 §6 (cache invalidation decision)](M3-preloading-caching.md#6-cache-invalidation-decision-documented).

---

## 7. What measurements tell us "we are now fast enough"?

All four green for 7 consecutive days on real Kerala-pilot traffic:

| Metric | Target | Source |
|---|---|---|
| TTFF p75 on 4G | < 1.5s | `usePlayerMetrics.ttff` event |
| Rebuffer ratio | < 1% of playback time | `usePlayerMetrics.rebuffer_*` events |
| Cold start p95 (mid-range Android) | < 2s | `coldStartMeter` + Sentry measurement |
| API p95 on `/feed` | < 200ms | Sentry Performance on Fastify |

Secondary (nice-to-have):

- Feed scroll: 60fps, no dropped frames (Sentry React Native profiling)
- Reel swipe latency (finger-down to next reel active): <50ms
- API p95 on `/content/:id`: <400ms

See [M5 §7 (fast enough)](M5-monitoring.md#7-answer-to-what-measurements-tell-us-were-fast-enough).

---

## 8. What measurements tell us we still need more?

After 30 days of field data:

| Signal | Meaning | Next investment |
|---|---|---|
| Rebuffer ratio > 3% persistent | CDN + ABR aren't enough on worst-case networks | Peer-to-peer chunk sharing (Peer5), more aggressive pre-warming, LL-HLS/CMAF evaluation, secondary CDN |
| TTFF p95 > 3s persistent | Initial rung too high OR Origin Shield not helping OR master.m3u8 slow | Audit ABR initial-rung heuristics; evaluate pre-generated first-segment caching on trending reels |
| MediaConvert queue backlog > 30 min regularly | Transcode capacity exceeded | Request AWS limit increase ($0), reserved queue ($400/month for 5 slots), or alt transcode stack (EC2 spot + SVT-AV1) |
| CloudFront egress > $500/month | CDN cost outpacing revenue | CloudFront commitment pricing, or swap to Fastly/BunnyCDN for region-specific pricing |
| Cold start p95 > 3s after M4 ships | Still-eager dependencies at startup | Audit import graph with `npx expo export` size report; defer more modules |
| API p95 `/feed` > 500ms despite Redis cache | DB is the bottleneck beyond cache | Investigate slow Prisma queries via Sentry; consider read-replicas; revisit feed algorithm complexity |

See [M5 §8 (still need more)](M5-monitoring.md#8-answer-to-what-tells-us-we-still-need-more).
