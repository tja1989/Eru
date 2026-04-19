# Known Unknowns

> Things that might force parts of this plan to change. Document what we're uncertain about so we don't pretend confidence we don't have.

## AWS MediaConvert HLS output path format

The exact S3 key pattern MediaConvert produces for HLS (`master.m3u8`, variant `.m3u8` files, and `.ts` segments) depends on internal MediaConvert naming rules that are documented but occasionally quirky in practice. The agent implementing M1 should do a **single dry-run with one test video** before writing the webhook parsing logic:

```bash
# After M1.3's triggerTranscode ships, fire one test job:
aws s3 ls s3://<bucket>/transcoded/<baseName>/
```

Expected pattern from `DirectoryStructure: 'SINGLE_DIRECTORY'` + `NameModifier: '_240p'`, etc.:

```
master.m3u8
_240p.m3u8
_240p_00001.ts
_240p_00002.ts
...
_360p.m3u8
_360p_00001.ts
...
```

If the actual pattern differs (e.g., MediaConvert places variants in subdirectories), adjust the regex in `webhooks.ts` and the `variantPaths.find(p => p.includes('240p'))` logic.

---

## EventBridge delivery to Railway

Railway's SSL cert (Let's Encrypt) might be rejected by AWS's HTTPS client in rare edge cases — specifically if the certificate chain uses a newer CA that's not yet in AWS's trust bundle. Monitor `FailedInvocations` for the EventBridge rule after setup. If >0 within the first day, fall back to an SQS intermediary:

```
MediaConvert state change → EventBridge → SQS queue → cron poller in Railway → POST /webhooks/mediaconvert
```

The cron poller pattern adds ~30s of latency but is more robust to transient HTTPS failures.

---

## expo-video ABR decisions on specific Android builds

Xiaomi's MIUI fork of Android sometimes tweaks ExoPlayer defaults — specifically around initial bitrate selection and bandwidth estimation decay. We won't know until we test on a Redmi or Realme in the field.

**Mitigation if ABR is misbehaving on MIUI specifically:**

1. Test with a `Redmi 10C` or `Realme Narzo 50` — these are sub-10,000 INR devices common in Kerala.
2. Compare `bitrate_switch` events from Sentry between Pixel, Samsung, and Xiaomi devices.
3. If Xiaomi shows bad patterns, consider:
   - Pinning `preferredPeakBitrate` via expo-video's native config (limited support).
   - Switching to react-native-video for fine-grained ABR control on Android only.

---

## CloudFront edge availability in Indian cities

AWS's region map shows edges in Mumbai, Chennai, Hyderabad, Bangalore, Delhi, and Kolkata — **but not in Kerala itself.** Users in Trivandrum or Kochi hit the Chennai edge over the national backbone (~15ms). If field data shows this is unacceptable latency, we have three options:

1. **Tertiary CDN with Kerala POP** (point of presence) — Fastly or BunnyCDN. ~$50–100/month floor.
2. **Pre-warm more aggressively in the Chennai edge** — already in M2's pre-warm strategy.
3. **Wait for AWS** — they've announced expanding to more Indian tier-2 cities in 2026+.

Measure via Sentry Performance on `/feed` from real Kerala users before deciding.

---

## Hermes with New Architecture + SDK 54 + expo-video 3

This combination is relatively new. Some libraries that worked on JSC may have subtle issues on Hermes-with-New-Arch. If any dependency crashes on Hermes during M4:

1. Fallback: revert `"jsEngine"` in `app.json` — app runs on JSC.
2. File an issue against the specific library.
3. Retry Hermes when the fix lands.

This is documented in [M4 §6 (what could go wrong)](M4-startup-bundle.md#6-what-could-go-wrong).

---

## Sentry event quota

Sentry's Team plan ($26/month) includes 5,000 errors + 100,000 transactions. At Eru's estimated scale during Kerala pilot (~1K active users × ~30 reels/day):

- Transactions: ~30,000/day of `usePlayerMetrics` events → 900K/month → **over quota**.

**Mitigation before M5 ships:**

- Set `tracesSampleRate: 0.1` (10% sampling) instead of 1.0.
- For the specific `reel_play` transaction, use `beforeSendTransaction` to sample at a lower rate (1% in production).
- Re-evaluate after the first month.

If sampling still exhausts the quota, either upgrade to Business ($80/month for 1M transactions) or swap transactions-only tracking to Amplitude / PostHog (both have generous free tiers for transaction-class events).

---

## View-count as "views-in-last-hour" proxy

`trendingService.getTopReels` uses `content.viewCount` as a proxy for views-in-the-last-hour. This is a known approximation that:

- Works **fine for early Eru traffic** (low enough volume that stale view counts don't meaningfully shift trending rankings).
- Breaks **as traffic grows** (a 30-day-old reel with 100K lifetime views outranks a 1-hour-old reel with 10K views, even though the latter is the "trending" one).

**Proper fix (deferred):** add a `ViewEvent` table with TTL-based retention (keep last 48 hours), run a materialised view every 5 min that computes views-last-hour per content. Or use ClickHouse if volume justifies it.

**When to fix:** when `trendingService` starts recommending suspiciously-old content in the pre-warm list (detected via Sentry breadcrumbs: old `createdAt` values in pre-warm requests).

---

## NetInfo accuracy on Android

`@react-native-community/netinfo` can return `cellularGeneration: null` or stale `downlinkMbps` readings during tower handoffs. M3's `preloadCountForBandwidth` falls back to "1 preload" when data is ambiguous, which is safe but suboptimal — users on wifi briefly see 1 preload instead of 3 until NetInfo refreshes.

**Mitigation:** M3.1's hook already re-subscribes via `useNetInfo()` which triggers on state changes. Watch Sentry `bitrate_switch` events on wifi-typed users — frequent switches suggest NetInfo is flapping.

---

## MediaConvert codec profile compatibility

Older Android builds (Android 10 and below, increasingly rare in 2026 but still present in Kerala budget-device land) sometimes only support H.264 **Baseline** profile, while MediaConvert's default is **Main**. If we see HLS manifest parse errors clustered on specific device models (visible in Sentry), the fix is to pin:

- `H264Settings.CodecProfile: 'BASELINE'` for 240p/360p
- `H264Settings.CodecProfile: 'HIGH'` for 540p/720p/1080p

Add this config to `createHlsOutput` in `transcodeService.ts`. Until field data indicates a problem, Main-profile defaults are fine.

---

## Reading CLAUDE.md files that change under us

The test-flake list in `apps/api/CLAUDE.md` names specific test files that sometimes fail under full-suite runs (`wallet-tier`, `spin`, `sponsorship`, `stories`, `reels-following`, `leaderboard-friends`). If any of M0–M5's new tests start appearing on that list, it means our test DB cleanup isn't isolating properly. Fix: add the new model's delete to `apps/api/tests/helpers/db.ts#cleanupTestData` in FK-safe order.

---

## The "how does this compare to TikTok?" question

Don't answer. TikTok runs a 2,000+ engineer video team with petabyte-scale ML prefetching and peer-to-peer chunk sharing. Our goal is "fast enough for Kerala pilot to feel pleasant," not parity with TikTok. The thresholds in M5 §7 are the real bar.

---

## Retrospective after completion

After M0–M5 ship and thresholds hold green for 7 days, write `GapFix/SpeedOptimization/retrospective.md` with:

- **Actual durations vs estimates** (be honest — plans underestimate by default).
- **Surprises** — things that broke that we didn't predict.
- **Numbers achieved** — TTFF p75, rebuffer, cold start, API p95 at the end of 30 days.
- **What would we do differently** — which milestones could have been ordered better, which tasks were wasted motion.

This retrospective feeds the next GapFix plan (whatever that becomes — probably related to the Phase 2 commerce layer).
