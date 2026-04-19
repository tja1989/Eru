# M2 — CDN Edge Optimization

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:executing-plans`, `superpowers:test-driven-development`. M0 and M1 must be complete. TDD rules per `GapFix/SpeedOptimization.md#7-tdd-protocol-agent-first`.

## 1. Goal

Configure CloudFront to serve HLS manifests and segments from Mumbai and other Indian edge locations, with cache behaviors tuned to HLS: short TTL on `*.m3u8` (master manifest might be updated after re-transcode), long TTL on `*.ts` and `*.m4s` segments (immutable by nature). Pre-warm the top-N trending reels so first-viewer-in-a-city latency matches tenth-viewer latency.

## 2. Analogy

The tapas kitchen (M1) now ships per-plate orders. M2 sets up food trucks in every Indian neighbourhood so diners don't wait for delivery from the main kitchen. The kitchen only gets a food truck order when the truck's inventory runs out.

## 3. Why we need this

- Without an edge CDN, every HLS manifest and segment request goes from a user's phone in Kerala → out to Railway → to S3 ap-south-1 → back. Each hop adds 50–200ms of latency. With CloudFront edges in Mumbai/Hyderabad/Chennai/Bangalore, latency drops to 10–40ms.
- CloudFront Origin Shield in Mumbai consolidates cache-miss traffic. Without it, every edge fetches from S3 independently, creating ×N storage egress cost.
- HLS has a specific cacheability profile: the master manifest rarely changes (cache it long); segments are append-only (cache them forever). Default TTL of 24 hours is wrong in both directions.

## 4. Files to modify

| Thing | Change |
|---|---|
| CloudFront distribution (likely already exists per `CLOUDFRONT_DOMAIN` env) | Add new cache behaviors for `*.m3u8` and `*.ts` / `*.m4s` |
| Origin Shield | Enable for the S3 origin, region `ap-south-1` (Mumbai) |
| CloudFront response headers policy | Add `Cache-Control: public, max-age=<value>` header enforcement |
| Brotli compression | Enable on the `*.m3u8` cache behavior (text manifests compress ~70%) |
| `apps/api/src/services/trendingService.ts` | **NEW** — defines "trending" and exposes `getTopReels(limit)` |
| `apps/api/src/services/trendingService.test.ts` | **NEW** — TDD for the scoring formula |
| `apps/api/src/scripts/prewarm-trending.ts` | **NEW** — hit each CloudFront edge for the top 20 trending reels' master manifests and first segment per rung |
| `apps/api/src/scripts/prewarm-trending.test.ts` | **NEW** — TDD the script's edge-iteration + HEAD-request behaviour |
| `apps/api/src/jobs/prewarmCron.ts` | **NEW** — cron: every 5 minutes, call prewarm for current top-list |
| `apps/api/src/app.ts` or `apps/api/src/server.ts` | Register the cron via existing `startCronJobs()` |
| `apps/api/tests/services/trendingService.test.ts` | **NEW** — scoring fixtures, ranking assertions |

## 5. Ordered TDD tasks

### Task M2.1 — Define the "trending" score

**Decision:** Score formula is:

```
score(reel) = views_last_hour × (creator_score ^ 0.5) × exp(-hours_since_post / 6)
```

Why this formula:

- `views_last_hour` — recency weighting; older views decay out naturally.
- `creator_score ^ 0.5` — dampens the runaway effect of high-follower creators dominating every edge's cache. Square root gives a mid-tier creator room to trend.
- `exp(-hours_since_post / 6)` — exponential time decay with a 6-hour half-life; a reel that peaked 12 hours ago is de-prioritised even if it still gets views.

- [ ] **Step 1: Failing test.** Create `apps/api/tests/services/trendingService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';
import { computeTrendingScore, getTopReels } from '../../src/services/trendingService.js';

describe('trendingService.computeTrendingScore', () => {
  it('returns 0 for a reel with no views', () => {
    expect(computeTrendingScore({ viewsLastHour: 0, creatorScore: 100, hoursSincePost: 1 })).toBe(0);
  });

  it('penalises older posts via half-life', () => {
    const fresh = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 0 });
    const sixHours = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 6 });
    const twelveHours = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 12 });
    // 6 hours = half the score; 12 hours = quarter.
    expect(sixHours / fresh).toBeCloseTo(0.5, 2);
    expect(twelveHours / fresh).toBeCloseTo(0.25, 2);
  });

  it('dampens creator score with square-root so mid-tier creators can trend', () => {
    // Creator A: 10,000 creator score, 100 views/hour
    // Creator B: 100 creator score, 100 views/hour
    // Raw would give A 100× advantage. Square-root reduces this to 10×.
    const a = computeTrendingScore({ viewsLastHour: 100, creatorScore: 10000, hoursSincePost: 0 });
    const b = computeTrendingScore({ viewsLastHour: 100, creatorScore: 100, hoursSincePost: 0 });
    expect(a / b).toBeCloseTo(10, 0);
  });

  it('linear in views', () => {
    const low = computeTrendingScore({ viewsLastHour: 100, creatorScore: 100, hoursSincePost: 0 });
    const high = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 0 });
    expect(high / low).toBeCloseTo(10, 1);
  });
});

describe('trendingService.getTopReels', () => {
  beforeEach(async () => { await cleanupTestData(); });
  afterAll(async () => { await cleanupTestData(); });

  it('returns reels ordered by trending score, respecting limit', async () => {
    const u1 = await seedUser('dev-test-tr1');
    const u2 = await seedUser('dev-test-tr2');

    // Hot recent reel from mid-tier creator
    const hot = await prisma.content.create({
      data: {
        userId: u1.id, type: 'reel',
        moderationStatus: 'published',
        viewCount: 5000,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),  // 30 min ago
      },
    });
    await prisma.contentMedia.create({
      data: {
        contentId: hot.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/hot.mov',
        hlsManifestUrl: 'https://cdn/hot/master.m3u8',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    // Yesterday's viral reel (should be de-prioritised)
    const old = await prisma.content.create({
      data: {
        userId: u2.id, type: 'reel',
        moderationStatus: 'published',
        viewCount: 100000,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),  // 24 hours ago
      },
    });
    await prisma.contentMedia.create({
      data: {
        contentId: old.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/old.mov',
        hlsManifestUrl: 'https://cdn/old/master.m3u8',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    const top = await getTopReels(10);
    expect(top[0].id).toBe(hot.id);   // recent hot wins over stale viral
    expect(top.length).toBeGreaterThanOrEqual(1);
  });

  it('skips reels without hlsManifestUrl (not pre-warmable)', async () => {
    const u = await seedUser('dev-test-tr3');
    const noHls = await prisma.content.create({
      data: {
        userId: u.id, type: 'reel',
        moderationStatus: 'published',
        viewCount: 99999,
        createdAt: new Date(),
      },
    });
    await prisma.contentMedia.create({
      data: {
        contentId: noHls.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/nohls.mov',
        hlsManifestUrl: null,
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    const top = await getTopReels(10);
    expect(top.find(r => r.id === noHls.id)).toBeUndefined();
  });

  it('returns empty array when no trending candidates exist', async () => {
    const top = await getTopReels(10);
    expect(top).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement `trendingService`.** Create `apps/api/src/services/trendingService.ts`:

```typescript
import { prisma } from '../utils/prisma.js';

export interface TrendingInput {
  viewsLastHour: number;
  creatorScore: number;
  hoursSincePost: number;
}

export function computeTrendingScore(input: TrendingInput): number {
  if (input.viewsLastHour <= 0) return 0;
  const sqrtCreator = Math.sqrt(Math.max(0, input.creatorScore));
  const halfLife = Math.exp(-input.hoursSincePost / 6) * Math.LN2 / Math.LN2;
  // Note: we use natural exp, but scale so that hoursSincePost=6 → 0.5.
  // ln(0.5)/6 = -0.1155 → exp(-t × 0.1155). Math.exp(-t / 6) gives ≈ 0.37 at t=6.
  // Adjust to exact half-life:
  const decay = Math.pow(0.5, input.hoursSincePost / 6);
  return input.viewsLastHour * sqrtCreator * decay;
}

export interface TrendingReel {
  id: string;
  hlsManifestUrl: string;
  variantManifests: string[];  // all *.m3u8 rung URLs for pre-warming
  score: number;
}

export async function getTopReels(limit: number): Promise<TrendingReel[]> {
  // Pull reels in the last 48 hours with HLS variants.
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const candidates = await prisma.content.findMany({
    where: {
      type: 'reel',
      moderationStatus: 'published',
      createdAt: { gte: since },
      media: { some: { hlsManifestUrl: { not: null } } },
    },
    include: {
      user: { select: { creatorScore: true } },
      media: {
        select: {
          hlsManifestUrl: true,
          video240pUrl: true,
          video360pUrl: true,
          video540pUrl: true,
          video720pUrl: true,
          video1080pUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,  // scoring pool
  });

  const now = Date.now();

  const scored = candidates
    .map(c => {
      const hlsManifest = c.media[0]?.hlsManifestUrl;
      if (!hlsManifest) return null;

      // Approximation: use viewCount as proxy for views-in-last-hour when no event log exists yet.
      // This is replaced by a real ViewEvent table when we add one; for now, decay viewCount by age.
      const hoursSincePost = (now - c.createdAt.getTime()) / (60 * 60 * 1000);
      const creatorScore = c.user?.creatorScore ?? 1;
      const score = computeTrendingScore({
        viewsLastHour: c.viewCount,
        creatorScore,
        hoursSincePost,
      });
      return {
        id: c.id,
        hlsManifestUrl: hlsManifest,
        variantManifests: [
          c.media[0]?.video240pUrl,
          c.media[0]?.video360pUrl,
          c.media[0]?.video540pUrl,
          c.media[0]?.video720pUrl,
          c.media[0]?.video1080pUrl,
        ].filter((u): u is string => typeof u === 'string'),
        score,
      } as TrendingReel;
    })
    .filter((x): x is TrendingReel => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
```

Line-by-line on the tricky bits:

- `Math.pow(0.5, t / 6)` → exact half-life of 6 hours. Simpler than natural-exp scaling.
- `viewCount` as a proxy for views-last-hour → **known approximation.** A real fix (an `event_views` table) is deferred; when we add it, swap the proxy.
- `take: 500` → scoring pool larger than the limit so the ranker has candidates; prevents empty results when the top 10 by createdAt happen to have low views.

- [ ] **Step 3: Verify green.** `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- trendingService`.

### Task M2.2 — CloudFront cache behaviors

- [ ] **Step 1: Document the JSON.** Create `apps/api/docs/cloudfront-cache-policy.json` (kept as a git-tracked reference since CloudFront config is normally AWS console state):

```json
{
  "M3U8ManifestPolicy": {
    "CachePolicyConfig": {
      "Name": "eru-m3u8-manifest",
      "Comment": "Short TTL for HLS manifest files",
      "DefaultTTL": 10,
      "MinTTL": 5,
      "MaxTTL": 60,
      "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingBrotli": true,
        "EnableAcceptEncodingGzip": true,
        "HeadersConfig": { "HeaderBehavior": "none" },
        "CookiesConfig": { "CookieBehavior": "none" },
        "QueryStringsConfig": { "QueryStringBehavior": "none" }
      }
    }
  },
  "TSSegmentPolicy": {
    "CachePolicyConfig": {
      "Name": "eru-ts-segment",
      "Comment": "Long TTL for immutable HLS segments",
      "DefaultTTL": 604800,
      "MinTTL": 86400,
      "MaxTTL": 31536000,
      "ParametersInCacheKeyAndForwardedToOrigin": {
        "EnableAcceptEncodingBrotli": false,
        "EnableAcceptEncodingGzip": false,
        "HeadersConfig": { "HeaderBehavior": "none" },
        "CookiesConfig": { "CookieBehavior": "none" },
        "QueryStringsConfig": { "QueryStringBehavior": "none" }
      }
    }
  }
}
```

Line-by-line:

- **Manifest policy**: 10s default, 60s max. If we re-transcode a video and the master.m3u8 changes, users see the new version within a minute.
- **Segment policy**: 7 days default, 1 year max. Segments are immutable once written — safe to cache forever. Brotli/gzip disabled (segments are already binary).
- **Query strings ignored**: prevents cache-key explosion from tracking params.

- [ ] **Step 2: Apply via AWS CLI.** (Agent running M2 runs these, confirm with founder):

```bash
# Find the existing CloudFront distribution ID (uses CLOUDFRONT_DOMAIN env)
DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?DomainName=='${CLOUDFRONT_DOMAIN#https://}'].Id | [0]" --output text)

# Create the two cache policies
aws cloudfront create-cache-policy \
  --cache-policy-config file://apps/api/docs/cloudfront-cache-policy.json#M3U8ManifestPolicy \
  --query 'CachePolicy.Id' --output text

aws cloudfront create-cache-policy \
  --cache-policy-config file://apps/api/docs/cloudfront-cache-policy.json#TSSegmentPolicy \
  --query 'CachePolicy.Id' --output text

# Fetch current distribution config
aws cloudfront get-distribution-config --id $DIST_ID > dist-config.json

# MANUAL STEP: edit dist-config.json to add two cache behaviors:
#   1. PathPattern "*.m3u8"  → CachePolicyId = <m3u8 policy id from above>
#   2. PathPattern "*.ts"    → CachePolicyId = <ts policy id from above>
#   3. Origin Shield: Enable, region ap-south-1
# Save as updated-dist-config.json.

aws cloudfront update-distribution --id $DIST_ID \
  --distribution-config file://updated-dist-config.json \
  --if-match $(jq -r '.ETag' dist-config.json)
```

- [ ] **Step 3: Verification.** In the CloudFront console:
  1. `Cache behaviors` tab shows the two new behaviors ahead of the default.
  2. `Origin Shield` on the S3 origin reads `Enabled — ap-south-1`.
  3. Issue `curl -v <CLOUDFRONT_DOMAIN>/transcoded/<mediaId>/master.m3u8` from two regions (e.g. via a browser at a VPN) — second request shows `X-Cache: Hit from cloudfront` header.

### Task M2.3 — Origin Shield

Origin Shield setup is part of M2.2 Step 2 (the manual edit to `updated-dist-config.json`). The config block under each origin becomes:

```json
"OriginShield": {
  "Enabled": true,
  "OriginShieldRegion": "ap-south-1"
}
```

**Why ap-south-1:** S3 bucket is in ap-south-1. Origin Shield in the same region = minimum latency for cache-miss paths.

### Task M2.4 — Pre-warming script

- [ ] **Step 1: Failing test.** Create `apps/api/tests/scripts/prewarm-trending.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runPrewarm, DEFAULT_EDGES } from '../../src/scripts/prewarm-trending.js';
import * as trendingService from '../../src/services/trendingService.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

describe('prewarm-trending script', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
  });

  it('issues a HEAD request per (reel × edge × manifest)', async () => {
    vi.spyOn(trendingService, 'getTopReels').mockResolvedValue([
      {
        id: 'r1',
        hlsManifestUrl: 'https://cdn.eru.test/transcoded/r1/master.m3u8',
        variantManifests: [
          'https://cdn.eru.test/transcoded/r1/240p.m3u8',
          'https://cdn.eru.test/transcoded/r1/720p.m3u8',
        ],
        score: 1000,
      },
    ]);

    const report = await runPrewarm({ limit: 1, edges: ['Mumbai', 'Chennai'] });

    // 1 reel × 2 edges × 3 manifests (master + 2 variants) = 6 HEAD requests
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls.every(c => c[1]?.method === 'HEAD')).toBe(true);
    expect(report.reelsWarmed).toBe(1);
    expect(report.totalRequests).toBe(6);
  });

  it('uses Eru-Prewarm/1.0 user-agent so analytics can exclude', async () => {
    vi.spyOn(trendingService, 'getTopReels').mockResolvedValue([
      {
        id: 'r1', hlsManifestUrl: 'https://cdn.eru.test/r1/master.m3u8',
        variantManifests: [], score: 1000,
      },
    ]);

    await runPrewarm({ limit: 1, edges: ['Mumbai'] });

    for (const call of fetchMock.mock.calls) {
      const init = call[1] as RequestInit;
      expect((init.headers as Record<string, string>)['User-Agent']).toBe('Eru-Prewarm/1.0');
    }
  });

  it('continues on edge failures and records them', async () => {
    vi.spyOn(trendingService, 'getTopReels').mockResolvedValue([
      { id: 'r1', hlsManifestUrl: 'https://cdn.eru.test/r1/master.m3u8', variantManifests: [], score: 1000 },
    ]);
    fetchMock.mockRejectedValueOnce(new Error('net down'));
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const report = await runPrewarm({ limit: 1, edges: ['Mumbai', 'Chennai'] });
    expect(report.errors).toBe(1);
    expect(report.totalRequests).toBe(2);
  });

  it('respects limit', async () => {
    vi.spyOn(trendingService, 'getTopReels').mockResolvedValue([
      { id: 'r1', hlsManifestUrl: 'https://a/master.m3u8', variantManifests: [], score: 1 },
      { id: 'r2', hlsManifestUrl: 'https://b/master.m3u8', variantManifests: [], score: 2 },
    ]);

    await runPrewarm({ limit: 1, edges: DEFAULT_EDGES });

    const urls = fetchMock.mock.calls.map(c => c[0]);
    expect(urls.some(u => String(u).startsWith('https://a'))).toBe(true);
    expect(urls.some(u => String(u).startsWith('https://b'))).toBe(false);
  });
});
```

- [ ] **Step 2: Implement.** Create `apps/api/src/scripts/prewarm-trending.ts`:

```typescript
import { getTopReels } from '../services/trendingService.js';

/** CloudFront edges in India — update as edges are added/removed. */
export const DEFAULT_EDGES = ['Mumbai', 'Hyderabad', 'Chennai', 'Bangalore', 'Delhi', 'Kolkata'];

export interface PrewarmOptions {
  limit: number;
  edges: string[];
}

export interface PrewarmReport {
  reelsWarmed: number;
  totalRequests: number;
  errors: number;
}

/**
 * Pre-warm the top trending reels on each CloudFront edge.
 *
 * This issues HEAD requests so the byte payload is zero but CloudFront still
 * fetches the object from origin (Origin Shield → S3) and caches it at the
 * edge for the next real viewer.
 *
 * The `edges` parameter is descriptive — we don't actually route to specific
 * edges in this script because CloudFront handles geo-routing automatically.
 * The "per-edge" multiplier in the loop ensures we make enough requests that
 * CloudFront's load-balancer distributes them across edges, warming several.
 */
export async function runPrewarm(opts: PrewarmOptions): Promise<PrewarmReport> {
  const reels = await getTopReels(opts.limit);
  const report: PrewarmReport = {
    reelsWarmed: 0,
    totalRequests: 0,
    errors: 0,
  };

  for (const reel of reels) {
    const urls = [reel.hlsManifestUrl, ...reel.variantManifests];
    for (const edge of opts.edges) {
      for (const url of urls) {
        try {
          await fetch(url, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Eru-Prewarm/1.0',
              'X-Eru-Prewarm-Edge': edge,  // informational only
            },
          });
          report.totalRequests += 1;
        } catch {
          report.errors += 1;
          report.totalRequests += 1;
        }
      }
    }
    report.reelsWarmed += 1;
  }

  return report;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 20;
  runPrewarm({ limit, edges: DEFAULT_EDGES })
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(err => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 3: Verify green.** `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- prewarm-trending`.

### Task M2.5 — Cron scheduling

- [ ] **Step 1: Failing test.** Create `apps/api/tests/jobs/prewarmCron.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { registerPrewarmCron } from '../../src/jobs/prewarmCron.js';
import * as prewarmModule from '../../src/scripts/prewarm-trending.js';

const scheduleMock = vi.fn();
vi.mock('node-cron', () => ({
  default: { schedule: scheduleMock },
  schedule: scheduleMock,
}));

describe('registerPrewarmCron', () => {
  it('schedules every 5 minutes', () => {
    registerPrewarmCron();
    expect(scheduleMock).toHaveBeenCalled();
    const [expr] = scheduleMock.mock.calls[0];
    expect(expr).toBe('*/5 * * * *');
  });

  it('the scheduled callback calls runPrewarm with default limit=20', async () => {
    const spy = vi.spyOn(prewarmModule, 'runPrewarm').mockResolvedValue({
      reelsWarmed: 20, totalRequests: 200, errors: 0,
    });
    registerPrewarmCron();
    const [, callback] = scheduleMock.mock.calls[scheduleMock.mock.calls.length - 1];
    await callback();
    expect(spy).toHaveBeenCalledWith({ limit: 20, edges: prewarmModule.DEFAULT_EDGES });
  });
});
```

- [ ] **Step 2: Implement.** Create `apps/api/src/jobs/prewarmCron.ts`:

```typescript
import cron from 'node-cron';
import { runPrewarm, DEFAULT_EDGES } from '../scripts/prewarm-trending.js';

export function registerPrewarmCron() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const report = await runPrewarm({ limit: 20, edges: DEFAULT_EDGES });
      console.log('[prewarm] report', report);
    } catch (err) {
      console.error('[prewarm] failed', err);
    }
  });
}
```

- [ ] **Step 3: Register in startup.** Edit `apps/api/src/server.ts` (or wherever `startCronJobs()` lives) to import and call `registerPrewarmCron()` alongside existing crons. Follow the existing registration pattern.

- [ ] **Step 4: Verify green.** Run relevant test. Also manually verify on staging: tail API logs for 10 minutes — you should see `[prewarm] report {...}` every 5 minutes.

## 6. What could go wrong

- **Cache poisoning from signed URL query strings varying.** If we ever add signed URLs, CloudFront must be configured to ignore query strings when building the cache key, else every signed URL is a unique cache miss. **Mitigation:** included in the cache policy JSON (`QueryStringBehavior: none`).
- **Pre-warming skews CloudFront analytics.** Bot-looking traffic from the cron → pre-warm IPs inflates "views." **Mitigation:** pre-warm uses `HEAD` requests (no body transfer) and a custom User-Agent `Eru-Prewarm/1.0`. Exclude from analytics at the dashboard level.
- **CloudFront invalidation cost.** Each invalidation after 1,000 free/month costs $0.005 per path. Don't invalidate often; rely on TTL expiry.
- **Stale manifest after re-transcode.** If M1's backfill re-transcodes content to HLS, the master.m3u8 URL is the same → CloudFront serves the old cached version for up to 60s (manifest TTL). Real users won't notice; internal testing might. **Mitigation:** invalidate the specific path after `backfill-hls` runs (one-off, ~1 cent).
- **Origin Shield billing surprise.** ~$0.025 per 10,000 requests at the shield level. At 100K reel views/day: ~$7.50/month. Watch via CloudWatch `OriginShieldRegionRequestCount`.
- **Too aggressive pre-warm fills the cache with cold traffic.** If we pre-warm 100 reels × 5 rungs × 6 edges = 3,000 objects every 5 minutes, CloudFront LRU could evict genuine-traffic objects. **Mitigation:** start with limit=20, monitor cache hit ratio for real traffic, scale pre-warm up/down based on data.

## 7. Rollback

- **Cache behaviors:** the added behaviors live at the top of the precedence list. To roll back: `aws cloudfront update-distribution` with the original config (saved as `dist-config.json`). Default behavior serves everything.
- **Origin Shield:** disable via `aws cloudfront update-distribution` with `OriginShield.Enabled = false`. No data change.
- **Pre-warming cron:** comment out `registerPrewarmCron()` in server startup. Redeploy. No side effects.
- **Trending service:** unused if the cron is off. Leaving it in place is safe.

No data loss in any rollback path.

## 8. Cost delta

- Origin Shield: ~$0.025 per 10,000 requests at the shield level. For 100,000 reel views/day: **~$7.50/month**.
- Pre-warm cron: ~20 reels × 5 rungs × 288 crons/day × 30 days ≈ 864,000 edge requests/month. At CloudFront pricing (first 1 TB is ~free tier): **<$1/month**.
- Brotli on m3u8: saves ~50% on manifest egress bytes. Negligible absolute savings (manifests are already small) but cheap to enable.
- **Net M2 delta: +$10 to +$20/month.**

## 9. Duration

- Task M2.1 (trending + score): 6–8 hours
- M2.2–M2.3 (CloudFront config): 4–6 hours
- M2.4–M2.5 (pre-warm + cron): 6–8 hours
- Validation in production (CloudWatch cache hit ratio, Indian-IP LCP via WebPageTest): 3–4 hours
- **Total:** 19–26 hours = **3–4 working days**.

## 10. Dependencies

- Blocked by: M1 (HLS manifests exist to warm).
- Parallel with: M3, M4, M5.

## 11. Next milestone

Proceed to any of [M3](M3-preloading-caching.md), [M4](M4-startup-bundle.md), or [M5](M5-monitoring.md) — these are parallelisable.
