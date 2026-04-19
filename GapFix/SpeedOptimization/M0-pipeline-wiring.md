# M0 — Pipeline Wiring + Mobile URL Helper + Backfill

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:executing-plans`, `superpowers:test-driven-development`. TDD rules per `GapFix/SpeedOptimization.md#7-tdd-protocol-agent-first`. This is the first milestone of the Option-C streaming overhaul; read the [index](../SpeedOptimization.md) first.

## 1. Goal (plain language)

Make the MediaConvert pipeline actually run when a user uploads a video, wire the completion webhook so the DB learns about finished transcodes, add a shared helper so mobile picks the best available variant, and backfill the existing seeded/production content.

## 2. Analogy

This is the dumbwaiter installation. After M0: every order (upload) triggers the kitchen (MediaConvert); the kitchen bell (EventBridge → webhook) tells the waitstaff the food is ready; waiters consult a clipboard (`pickVideoUrl`) before serving; old orders still on the chopping board (existing content with `originalUrl` only) get re-routed through the kitchen (backfill script).

## 3. Why we need this first

- Without M0, HLS migration in M1 is pointless: the same un-wired pipeline will still never fire.
- Wiring MP4 first is a smaller surface area than wiring HLS: we validate EventBridge routing, the webhook endpoint, the backfill script, and the mobile helper against the simpler progressive-MP4 world, THEN switch MediaConvert to HLS in M1 and only the `transcodeService.ts` internals change.
- Failure to ship M0 leaves every reel on the app serving the raw upload — a 150MB .mov from iPhone, 50MB from Android — to every viewer. A single viewer's first tap on a reel could burn their entire daily data cap.

## 4. Files to modify (exact paths + line numbers)

| File | Change |
|---|---|
| `apps/api/src/services/transcodeService.ts:20` | `triggerTranscode` already exists; add userMetadata route hint for webhook identification |
| `apps/api/src/routes/content.ts:82–92` | After `contentMedia.updateMany`, fetch media rows with `type='video'` and call `triggerTranscode` for each |
| `apps/api/src/routes/webhooks.ts` | **NEW** — `POST /webhooks/mediaconvert` endpoint, verifies shared-secret header, routes to `handleTranscodeComplete` / `handleTranscodeFailed` |
| `apps/api/src/app.ts:84–108` | Register `webhookRoutes` (pre-auth; header-secret auth instead) |
| `apps/api/src/middleware/webhookAuth.ts` | **NEW** — verifies `X-Webhook-Secret` header matches `MEDIACONVERT_WEBHOOK_SECRET` env var |
| `apps/api/src/scripts/backfill-transcodes.ts` | **NEW** — find all `ContentMedia` where `type='video'` AND `transcodeStatus IN ('pending','failed')` AND `video720pUrl IS NULL`, call `triggerTranscode` for each |
| `packages/shared/src/media.ts` | **NEW** — `pickVideoUrl(media)` helper |
| `packages/shared/src/media.test.ts` | **NEW** — tests for `pickVideoUrl` |
| `packages/shared/src/index.ts` | Export `pickVideoUrl` and the `PickableMedia` type |
| `apps/mobile/app/(tabs)/reels.tsx:55` | Replace `item.media?.[0]?.originalUrl` with `pickVideoUrl(item.media?.[0])` |
| `apps/mobile/components/PostCard.tsx:42–44` | Replace `mediaItem?.originalUrl` with `pickVideoUrl(mediaItem)` for video, keep originalUrl for image |
| `apps/mobile/__tests__/helpers/media.ts` | **NEW** — test helper per index §7.4 |
| `apps/api/tests/helpers/streaming.ts` | **NEW** — test helpers per index §7.3 |
| `apps/api/prisma/schema.prisma` | No change in M0 (M1 adds hlsManifestUrl) |

## 5. AWS infrastructure to configure

- **EventBridge rule** in ap-south-1: filter `source=aws.mediaconvert`, `detail-type="MediaConvert Job State Change"`, `detail.status IN ["COMPLETE","ERROR"]`.
- **EventBridge target:** API Destination pointing to `https://eruapi-production.up.railway.app/webhooks/mediaconvert` with a connection header `X-Webhook-Secret: <secret>`.
- **Railway env vars:** add `MEDIACONVERT_WEBHOOK_SECRET=<random-32-byte-hex>`.
- Already present: `MEDIACONVERT_ROLE_ARN`, `AWS_REGION`, `S3_BUCKET`, `CLOUDFRONT_DOMAIN`.

**Shell commands for AWS setup** (the agent implementing M0 runs these; confirm with founder first):

```bash
# 1. Create an EventBridge API Destination Connection (header auth)
aws events create-connection \
  --name eru-mediaconvert-webhook \
  --authorization-type API_KEY \
  --auth-parameters '{"ApiKeyAuthParameters":{"ApiKeyName":"X-Webhook-Secret","ApiKeyValue":"<same-secret-as-railway>"}}'  \
  --region ap-south-1

# 2. Create an EventBridge API Destination pointing at the Railway URL
aws events create-api-destination \
  --name eru-mediaconvert-target \
  --connection-arn <arn from step 1> \
  --invocation-endpoint https://eruapi-production.up.railway.app/api/v1/webhooks/mediaconvert \
  --http-method POST \
  --region ap-south-1

# 3. Create the rule
aws events put-rule \
  --name eru-mediaconvert-completion \
  --event-pattern '{"source":["aws.mediaconvert"],"detail-type":["MediaConvert Job State Change"],"detail":{"status":["COMPLETE","ERROR"]}}' \
  --region ap-south-1

# 4. Attach target
aws events put-targets \
  --rule eru-mediaconvert-completion \
  --targets 'Id=1,Arn=<api destination arn from step 2>,RoleArn=<an IAM role arn with events:InvokeApiDestination>' \
  --region ap-south-1
```

## 6. Ordered TDD tasks

### Task M0.1 — `pickVideoUrl` shared helper

**Why first:** No API or mobile change makes sense until the helper exists. Pure function, fastest to TDD.

- [ ] **Step 1: Failing test.** Create `packages/shared/src/media.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { pickVideoUrl } from './media';

describe('pickVideoUrl', () => {
  it('returns undefined for null/undefined', () => {
    expect(pickVideoUrl(null)).toBeUndefined();
    expect(pickVideoUrl(undefined)).toBeUndefined();
  });

  it('returns originalUrl when no variants present', () => {
    expect(pickVideoUrl({ originalUrl: 'https://cdn/original.mp4' })).toBe('https://cdn/original.mp4');
  });

  it('prefers video360pUrl over originalUrl', () => {
    expect(pickVideoUrl({
      originalUrl: 'https://cdn/original.mp4',
      video360pUrl: 'https://cdn/360.mp4',
    })).toBe('https://cdn/360.mp4');
  });

  it('prefers video720pUrl over 360p', () => {
    expect(pickVideoUrl({
      originalUrl: 'https://cdn/original.mp4',
      video360pUrl: 'https://cdn/360.mp4',
      video720pUrl: 'https://cdn/720.mp4',
    })).toBe('https://cdn/720.mp4');
  });

  it('prefers hlsManifestUrl over 720p', () => {
    expect(pickVideoUrl({
      originalUrl: 'https://cdn/original.mp4',
      video720pUrl: 'https://cdn/720.mp4',
      hlsManifestUrl: 'https://cdn/master.m3u8',
    })).toBe('https://cdn/master.m3u8');
  });

  it('ignores 1080p by default (wifi-only rung, decided per-caller)', () => {
    // 1080p is intentionally NOT preferred automatically — mobile client decides
    // whether to request it based on detected network. See M3.
    expect(pickVideoUrl({
      video720pUrl: 'https://cdn/720.mp4',
      video1080pUrl: 'https://cdn/1080.mp4',
    })).toBe('https://cdn/720.mp4');
  });

  it('returns 1080p when explicitly allowed', () => {
    expect(pickVideoUrl(
      { video720pUrl: 'https://cdn/720.mp4', video1080pUrl: 'https://cdn/1080.mp4' },
      { allow1080p: true },
    )).toBe('https://cdn/1080.mp4');
  });
});
```

**Why the 1080p rule:** 1080p = ~5 Mbps. On metered Indian 4G this burns user data. Default to 720p and let the preload logic in M3 opt-in to 1080p when wifi is detected.

- [ ] **Step 2: Implement.** Create `packages/shared/src/media.ts`:

```typescript
export interface PickableMedia {
  originalUrl?: string | null;
  video360pUrl?: string | null;
  video540pUrl?: string | null;  // added by M1
  video720pUrl?: string | null;
  video1080pUrl?: string | null;
  hlsManifestUrl?: string | null; // added by M1
}

export interface PickOptions {
  allow1080p?: boolean;
}

export function pickVideoUrl(
  media: PickableMedia | null | undefined,
  opts: PickOptions = {},
): string | undefined {
  if (!media) return undefined;
  if (media.hlsManifestUrl) return media.hlsManifestUrl;
  if (opts.allow1080p && media.video1080pUrl) return media.video1080pUrl;
  if (media.video720pUrl) return media.video720pUrl;
  if (media.video540pUrl) return media.video540pUrl;
  if (media.video360pUrl) return media.video360pUrl;
  return media.originalUrl ?? undefined;
}
```

Line-by-line:

- `export interface PickableMedia` → defines the shape of what the function accepts. Nullable strings because Prisma returns NULL from columns that haven't been populated yet.
- `if (!media) return undefined;` → null-safe, returns nothing instead of crashing when called with no data.
- `if (media.hlsManifestUrl)` → HLS always wins when it exists; ABR picks the right quality inside the player.
- `if (opts.allow1080p && media.video1080pUrl)` → explicit opt-in for 1080p to avoid burning user data.
- Falls through 720 → 540 → 360 → original, choosing the highest quality actually available.

- [ ] **Step 3: Export.** Edit `packages/shared/src/index.ts` to add:

```typescript
export { pickVideoUrl, type PickableMedia, type PickOptions } from './media';
```

- [ ] **Step 4: Verify green.** Run `cd packages/shared && npm test -- media`. All 7 assertions must pass.

- [ ] **Step 5: Type-check both apps.** Run `cd apps/api && npx tsc --noEmit` and `cd apps/mobile && npx tsc --noEmit`. Both should remain green (the 6 pre-existing mobile errors are not new).

**Why does this matter?** This single 15-line helper is the seam where the app chooses what to play. Every subsequent milestone reads from it. Getting it wrong — say, defaulting to 1080p — would silently 6x user bandwidth consumption in production.

---

### Task M0.2 — Webhook route (TDD)

**Why second:** The API must be able to receive completion events before we fire any MediaConvert jobs, else successful transcodes produce no DB updates.

- [ ] **Step 1: Create test helpers.** `apps/api/tests/helpers/streaming.ts`:

```typescript
import { prisma } from '../../src/utils/prisma.js';

export function fakeMediaConvertCompletionEvent(mediaId: string, outputPrefix: string) {
  return {
    version: '0',
    id: 'test-event-id',
    'detail-type': 'MediaConvert Job State Change',
    source: 'aws.mediaconvert',
    account: '000000000000',
    time: new Date().toISOString(),
    region: 'ap-south-1',
    resources: ['arn:aws:mediaconvert:ap-south-1:000000000000:jobs/test'],
    detail: {
      status: 'COMPLETE',
      userMetadata: { mediaId },
      outputGroupDetails: [{
        outputDetails: [
          { outputFilePaths: [`s3://bucket/${outputPrefix}_360p.mp4`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}_720p.mp4`] },
          { outputFilePaths: [`s3://bucket/${outputPrefix}_1080p.mp4`] },
        ],
      }],
    },
  };
}

export function fakeMediaConvertFailureEvent(mediaId: string, errorCode: string) {
  return {
    version: '0',
    id: 'test-event-id',
    'detail-type': 'MediaConvert Job State Change',
    source: 'aws.mediaconvert',
    account: '000000000000',
    time: new Date().toISOString(),
    region: 'ap-south-1',
    resources: ['arn:aws:mediaconvert:ap-south-1:000000000000:jobs/test'],
    detail: {
      status: 'ERROR',
      errorCode,
      userMetadata: { mediaId },
    },
  };
}

export async function seedPendingVideoMedia(opts: { userId: string; contentId: string }) {
  return prisma.contentMedia.create({
    data: {
      contentId: opts.contentId,
      type: 'video',
      originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-abc.mov',
      width: 1080,
      height: 1920,
      transcodeStatus: 'processing',
    },
  });
}
```

- [ ] **Step 2: Failing test.** Create `apps/api/tests/routes/webhooks.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';
import { fakeMediaConvertCompletionEvent, fakeMediaConvertFailureEvent, seedPendingVideoMedia } from '../helpers/streaming.js';

describe('POST /webhooks/mediaconvert', () => {
  let app: FastifyInstance;
  const SECRET = 'test-secret-32-bytes-long-xxxxxx';

  beforeAll(async () => {
    process.env.MEDIACONVERT_WEBHOOK_SECRET = SECRET;
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';
    app = await getTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  it('rejects requests without the secret header (401)', async () => {
    const user = await seedUser('dev-test-wh1', { tier: 'bronze' });
    const content = await seedContent({ userId: user.id, type: 'reel' });
    const media = await seedPendingVideoMedia({ userId: user.id, contentId: content.id });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/abc'),
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with a wrong secret (401)', async () => {
    const user = await seedUser('dev-test-wh2');
    const content = await seedContent({ userId: user.id, type: 'reel' });
    const media = await seedPendingVideoMedia({ userId: user.id, contentId: content.id });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': 'wrong-secret' },
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/abc'),
    });

    expect(res.statusCode).toBe(401);
  });

  it('on COMPLETE event, populates video{360,720,1080}pUrl and sets status=complete', async () => {
    const user = await seedUser('dev-test-wh3');
    const content = await seedContent({ userId: user.id, type: 'reel' });
    const media = await seedPendingVideoMedia({ userId: user.id, contentId: content.id });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/abc'),
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.transcodeStatus).toBe('complete');
    expect(updated?.video360pUrl).toBe('https://cdn.eru.test/transcoded/abc_360p.mp4');
    expect(updated?.video720pUrl).toBe('https://cdn.eru.test/transcoded/abc_720p.mp4');
    expect(updated?.video1080pUrl).toBe('https://cdn.eru.test/transcoded/abc_1080p.mp4');
  });

  it('on ERROR event, sets status=failed', async () => {
    const user = await seedUser('dev-test-wh4');
    const content = await seedContent({ userId: user.id, type: 'reel' });
    const media = await seedPendingVideoMedia({ userId: user.id, contentId: content.id });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertFailureEvent(media.id, 'INPUT_FILE_DECODE_ERROR'),
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.transcodeStatus).toBe('failed');
  });

  it('is idempotent: replaying the same COMPLETE event does not fail', async () => {
    const user = await seedUser('dev-test-wh5');
    const content = await seedContent({ userId: user.id, type: 'reel' });
    const media = await seedPendingVideoMedia({ userId: user.id, contentId: content.id });

    for (let i = 0; i < 3; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/mediaconvert',
        headers: { 'x-webhook-secret': SECRET },
        payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/abc'),
      });
      expect(res.statusCode).toBe(200);
    }

    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.transcodeStatus).toBe('complete');
  });

  it('returns 404 for an unknown mediaId (event arrived after media deletion)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertCompletionEvent('00000000-0000-0000-0000-aaaaaaaaaaaa', 'transcoded/deadbeef'),
    });

    expect(res.statusCode).toBe(404);
  });
});
```

- [ ] **Step 3: Implement middleware.** `apps/api/src/middleware/webhookAuth.ts`:

```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { Errors } from '../utils/errors.js';

export async function webhookAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const headerSecret = request.headers['x-webhook-secret'];
  const expected = process.env.MEDIACONVERT_WEBHOOK_SECRET;
  if (!expected) {
    // Misconfiguration: fail closed. Do not accept webhooks if the secret env is missing.
    throw Errors.unauthorized('Webhook not configured');
  }
  if (headerSecret !== expected) {
    throw Errors.unauthorized('Invalid webhook secret');
  }
}
```

- [ ] **Step 4: Implement route.** `apps/api/src/routes/webhooks.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';
import { webhookAuthMiddleware } from '../middleware/webhookAuth.js';
import { handleTranscodeComplete, handleTranscodeFailed } from '../services/transcodeService.js';

interface MediaConvertEvent {
  source?: string;
  detail?: {
    status?: 'COMPLETE' | 'ERROR';
    userMetadata?: { mediaId?: string };
    outputGroupDetails?: Array<{
      outputDetails?: Array<{ outputFilePaths?: string[] }>;
    }>;
    errorCode?: string;
  };
}

export async function webhookRoutes(app: FastifyInstance) {
  // Pre-auth; uses header-secret middleware instead.
  app.addHook('preHandler', webhookAuthMiddleware);

  app.post('/webhooks/mediaconvert', async (request, reply) => {
    const event = request.body as MediaConvertEvent;
    if (event.source !== 'aws.mediaconvert') {
      throw Errors.badRequest('Not a MediaConvert event');
    }

    const mediaId = event.detail?.userMetadata?.mediaId;
    if (!mediaId) {
      throw Errors.badRequest('Missing mediaId in userMetadata');
    }

    // Ensure the media still exists before mutating (covers deleted-before-webhook-arrives)
    const media = await prisma.contentMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw Errors.notFound('ContentMedia');
    }

    if (event.detail?.status === 'COMPLETE') {
      // Extract output S3 keys from the first output group.
      const outputs = event.detail.outputGroupDetails?.[0]?.outputDetails ?? [];
      const keys = outputs
        .map(o => o.outputFilePaths?.[0])
        .filter((k): k is string => typeof k === 'string')
        .map(k => k.replace(/^s3:\/\/[^/]+\//, '')); // strip the s3://bucket/ prefix

      const p360 = keys.find(k => k.includes('_360p'));
      const p720 = keys.find(k => k.includes('_720p'));
      const p1080 = keys.find(k => k.includes('_1080p'));

      if (!p360 || !p720 || !p1080) {
        throw Errors.badRequest('Incomplete output set from MediaConvert');
      }

      await handleTranscodeComplete(mediaId, { p360, p720, p1080 });
    } else if (event.detail?.status === 'ERROR') {
      await handleTranscodeFailed(mediaId);
    } else {
      throw Errors.badRequest('Unknown MediaConvert status');
    }

    return reply.status(200).send({ ok: true });
  });
}
```

- [ ] **Step 5: Register in app.** Edit `apps/api/src/app.ts` to add `webhookRoutes` to the `app.register(...)` list, prefixed with `/api/v1` like every other route group.

- [ ] **Step 6: Verify green.** Run `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- webhooks`. All 6 assertions must pass.

**Why does this matter?** The webhook is the only way the DB learns about completed transcodes. Without it, every completed MediaConvert job silently produces output in S3 that nothing ever reads. We'd be paying for transcoding that never reaches users.

---

### Task M0.3 — Wire `triggerTranscode` into `/content/create` (TDD)

**Why third:** Now that the webhook exists, it's safe to fire jobs — completions will land somewhere.

- [ ] **Step 1: Failing test.** Edit `apps/api/tests/routes/content.test.ts` (or create if none matches; at minimum there should be an existing content-create test to extend):

```typescript
import { vi } from 'vitest';
import * as transcodeService from '../../src/services/transcodeService.js';

// Existing test file should already have setup; add these blocks:

describe('POST /content/create — transcode triggering', () => {
  it('calls triggerTranscode for each video media attached', async () => {
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockResolvedValue(undefined);
    const user = await seedUser('dev-test-tt1');

    // Pre-create two video media rows pointing at the placeholder contentId
    const m1 = await prisma.contentMedia.create({
      data: {
        contentId: '00000000-0000-0000-0000-000000000000',
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-v1.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });
    const m2 = await prisma.contentMedia.create({
      data: {
        contentId: '00000000-0000-0000-0000-000000000000',
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-v2.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { authorization: devToken('dev-test-tt1') },
      payload: {
        type: 'reel',
        text: 'Video post',
        mediaIds: [m1.id, m2.id],
        hashtags: [],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(m1.id, expect.stringContaining('originals/dev-test-v1.mov'));
    expect(spy).toHaveBeenCalledWith(m2.id, expect.stringContaining('originals/dev-test-v2.mov'));
    spy.mockRestore();
  });

  it('does NOT call triggerTranscode for image media', async () => {
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockResolvedValue(undefined);
    const user = await seedUser('dev-test-tt2');

    const img = await prisma.contentMedia.create({
      data: {
        contentId: '00000000-0000-0000-0000-000000000000',
        type: 'image',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-i1.jpg',
        width: 1080, height: 1080,
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { authorization: devToken('dev-test-tt2') },
      payload: {
        type: 'post',
        text: 'Image post',
        mediaIds: [img.id],
        hashtags: [],
      },
    });

    expect(res.statusCode).toBe(201);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('if triggerTranscode throws, content creation still succeeds (fire-and-forget)', async () => {
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockRejectedValue(new Error('MediaConvert boom'));
    const user = await seedUser('dev-test-tt3');

    const vid = await prisma.contentMedia.create({
      data: {
        contentId: '00000000-0000-0000-0000-000000000000',
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-v3.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { authorization: devToken('dev-test-tt3') },
      payload: { type: 'reel', text: 'Video post', mediaIds: [vid.id], hashtags: [] },
    });

    expect(res.statusCode).toBe(201);  // creation succeeded
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
```

**Why fire-and-forget:** If MediaConvert is down, users should still be able to post. The DB row gets created with `transcodeStatus='pending'`; a cron or manual backfill retries later.

- [ ] **Step 2: Implement.** Edit `apps/api/src/routes/content.ts` lines 82–92 area to become:

```typescript
    // Link any pre-uploaded media to this new content row
    if (mediaIds.length > 0) {
      await prisma.contentMedia.updateMany({
        where: {
          id: { in: mediaIds },
          contentId: '00000000-0000-0000-0000-000000000000',
        },
        data: { contentId: content.id },
      });

      // Re-fetch the linked media to know which are videos + their S3 keys.
      const linked = await prisma.contentMedia.findMany({
        where: { id: { in: mediaIds }, contentId: content.id, type: 'video' },
      });

      // Fire-and-forget transcode triggers. Errors are logged but do not fail the request.
      for (const m of linked) {
        const s3Key = extractS3Key(m.originalUrl);
        if (!s3Key) continue;
        triggerTranscode(m.id, s3Key).catch(err => {
          request.log.error({ mediaId: m.id, err }, 'triggerTranscode failed');
        });
      }
    }
```

Add helper `extractS3Key` (either in `apps/api/src/utils/s3.ts` as a new file, or inline):

```typescript
// apps/api/src/utils/s3.ts
const S3_PREFIX_REGEX = /^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/(.+)$/;
const CLOUDFRONT_PREFIX_REGEX = /^https:\/\/[^/]+\/(.+)$/;

export function extractS3Key(url: string): string | null {
  const s3Match = url.match(S3_PREFIX_REGEX);
  if (s3Match) return s3Match[1];
  // CloudFront-delivered URLs fall back to path component (assumes S3 origin uses same path)
  const cfMatch = url.match(CLOUDFRONT_PREFIX_REGEX);
  return cfMatch?.[1] ?? null;
}
```

Import at top of `content.ts`:

```typescript
import { triggerTranscode } from '../services/transcodeService.js';
import { extractS3Key } from '../utils/s3.js';
```

- [ ] **Step 3: Verify green.** Run `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- content`. All 3 new assertions plus every pre-existing content test must pass.

**Why does this matter?** This is THE fix for the dormant-pipeline root cause. From this commit onward, every new reel upload fires a MediaConvert job.

---

### Task M0.4 — Mobile URL helper adoption

**Why fourth:** Server now produces variants; mobile can now pick them.

- [ ] **Step 1: Failing test.** Create `apps/mobile/__tests__/utils/pickVideoUrl.test.ts`:

```typescript
import { pickVideoUrl } from '@eru/shared';

describe('mobile uses pickVideoUrl', () => {
  it('imports from @eru/shared', () => {
    expect(typeof pickVideoUrl).toBe('function');
  });
});
```

- [ ] **Step 2: Failing test on reels.tsx.** Create/update `apps/mobile/__tests__/screens/reels-video-url.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import Reels from '@/app/(tabs)/reels';

// Mock expo-video
const mockPlay = jest.fn();
const mockPause = jest.fn();
jest.mock('expo-video', () => ({
  useVideoPlayer: (source: unknown) => ({
    source,
    play: mockPlay,
    pause: mockPause,
  }),
  VideoView: ({ player }: { player: { source: unknown } }) => (
    <div data-testid="videoview" data-source={JSON.stringify(player.source)} />
  ),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/services/contentService', () => ({
  getReels: jest.fn().mockResolvedValue({
    items: [{
      id: 'r1',
      type: 'reel',
      text: '',
      media: [{ originalUrl: 'https://cdn/original.mov', video720pUrl: 'https://cdn/720.mp4' }],
      user: { id: 'u1', name: 'Test', username: 'test', avatarUrl: null, isVerified: false, tier: 'bronze' },
    }],
    page: 1, limit: 10, total: 1,
  }),
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: unknown) => (sel as (s: unknown) => unknown)({ user: { id: 'u-me' } }),
}));

describe('Reels tab picks video720pUrl over originalUrl', () => {
  it('renders with the 720p URL', async () => {
    const { findByTestId } = render(<Reels />);
    const view = await findByTestId('videoview');
    const source = JSON.parse(view.props['data-source']);
    expect(source).toEqual(expect.objectContaining({ uri: 'https://cdn/720.mp4' }));
  });
});
```

- [ ] **Step 3: Implement reels.tsx change.** Edit `apps/mobile/app/(tabs)/reels.tsx:55`:

Before:
```typescript
const videoUrl = item.media?.[0]?.originalUrl;
```

After:
```typescript
import { pickVideoUrl } from '@eru/shared';
// ...
const videoUrl = pickVideoUrl(item.media?.[0]);
```

- [ ] **Step 4: Implement PostCard.tsx change.** Edit `apps/mobile/components/PostCard.tsx:42–44`:

Before:
```typescript
const mediaItem = post.media?.[0];
const isVideo = mediaItem?.type === 'video';
const videoUrl = isVideo ? mediaItem?.originalUrl : null;
const imageUrl = mediaItem?.thumbnailUrl || mediaItem?.originalUrl;
```

After:
```typescript
import { pickVideoUrl } from '@eru/shared';
// ...
const mediaItem = post.media?.[0];
const isVideo = mediaItem?.type === 'video';
const videoUrl = isVideo ? pickVideoUrl(mediaItem) : null;
const imageUrl = mediaItem?.thumbnailUrl || mediaItem?.originalUrl;
```

- [ ] **Step 5: Verify green.** Run `cd apps/mobile && npm test -- pickVideoUrl reels-video-url`. Both new tests must pass. Also run `cd apps/mobile && npm test` for the full suite; the PostCard tests must not regress.

**Why does this matter?** Without this step, every reel plays the original 150MB iPhone upload. With this step, the 3MB 720p variant plays instead — a ~50x bandwidth reduction per view on first-reel-load alone.

---

### Task M0.5 — Backfill script

**Why fifth:** Production/staging has content uploaded BEFORE M0.3 shipped. Those rows have `transcodeStatus='pending'` (or 'complete' by seed script fiat) but NULL variant URLs. Without backfill, only content uploaded AFTER M0.3 benefits.

- [ ] **Step 1: Failing test.** Create `apps/api/tests/scripts/backfill-transcodes.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';
import * as transcodeService from '../../src/services/transcodeService.js';
import { runBackfill } from '../../src/scripts/backfill-transcodes.js';

describe('backfill-transcodes script', () => {
  beforeEach(async () => { await cleanupTestData(); });
  afterAll(async () => { await cleanupTestData(); });

  it('fires triggerTranscode for video media with NULL variant URLs', async () => {
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockResolvedValue(undefined);
    const user = await seedUser('dev-test-bf1');
    const content = await seedContent({ userId: user.id, type: 'reel' });

    // Case 1: pending + no variants → should backfill
    const m1 = await prisma.contentMedia.create({
      data: {
        contentId: content.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-m1.mov',
        width: 1080, height: 1920, transcodeStatus: 'pending',
      },
    });

    // Case 2: complete + no variants (seed-reels quirk) → should backfill
    const m2 = await prisma.contentMedia.create({
      data: {
        contentId: content.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-m2.mov',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    // Case 3: complete + variants populated → should SKIP
    const m3 = await prisma.contentMedia.create({
      data: {
        contentId: content.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-m3.mov',
        video720pUrl: 'https://cdn/720.mp4',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    // Case 4: image → should SKIP
    const m4 = await prisma.contentMedia.create({
      data: {
        contentId: content.id, type: 'image',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-i1.jpg',
        width: 1080, height: 1080,
      },
    });

    const report = await runBackfill({ dryRun: false, limit: 100 });
    expect(report.totalCandidates).toBe(2);
    expect(report.triggered).toBe(2);
    expect(spy).toHaveBeenCalledWith(m1.id, expect.stringContaining('dev-test-m1.mov'));
    expect(spy).toHaveBeenCalledWith(m2.id, expect.stringContaining('dev-test-m2.mov'));
    spy.mockRestore();
  });

  it('dry-run reports count without firing', async () => {
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockResolvedValue(undefined);
    const user = await seedUser('dev-test-bf2');
    const content = await seedContent({ userId: user.id, type: 'reel' });

    await prisma.contentMedia.create({
      data: {
        contentId: content.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-dry.mov',
        width: 1080, height: 1920, transcodeStatus: 'pending',
      },
    });

    const report = await runBackfill({ dryRun: true, limit: 100 });
    expect(report.totalCandidates).toBe(1);
    expect(report.triggered).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('respects --limit', async () => {
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockResolvedValue(undefined);
    const user = await seedUser('dev-test-bf3');
    const content = await seedContent({ userId: user.id, type: 'reel' });

    for (let i = 0; i < 5; i++) {
      await prisma.contentMedia.create({
        data: {
          contentId: content.id, type: 'video',
          originalUrl: `https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-lim${i}.mov`,
          width: 1080, height: 1920, transcodeStatus: 'pending',
        },
      });
    }

    const report = await runBackfill({ dryRun: false, limit: 3 });
    expect(report.totalCandidates).toBe(5);
    expect(report.triggered).toBe(3);
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Implement.** Create `apps/api/src/scripts/backfill-transcodes.ts`:

```typescript
import { prisma } from '../utils/prisma.js';
import { triggerTranscode } from '../services/transcodeService.js';
import { extractS3Key } from '../utils/s3.js';

export interface BackfillOptions {
  dryRun: boolean;
  limit: number;
}

export interface BackfillReport {
  totalCandidates: number;
  triggered: number;
  skipped: number;
  errors: number;
}

export async function runBackfill(opts: BackfillOptions): Promise<BackfillReport> {
  // Find all video media with missing variant URLs.
  const candidates = await prisma.contentMedia.findMany({
    where: {
      type: 'video',
      video720pUrl: null,   // primary variant — if this is null, the pipeline never ran for this row
    },
    orderBy: { id: 'asc' },
  });

  const report: BackfillReport = {
    totalCandidates: candidates.length,
    triggered: 0,
    skipped: 0,
    errors: 0,
  };

  if (opts.dryRun) {
    return report;
  }

  const slice = candidates.slice(0, opts.limit);
  for (const m of slice) {
    const s3Key = extractS3Key(m.originalUrl);
    if (!s3Key) {
      report.skipped += 1;
      continue;
    }
    try {
      await triggerTranscode(m.id, s3Key);
      report.triggered += 1;
    } catch (err) {
      console.error('[backfill] trigger failed for', m.id, err);
      report.errors += 1;
    }
  }

  return report;
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = !process.argv.includes('--apply');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;

  runBackfill({ dryRun, limit })
    .then(report => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 3: Add npm script** in `apps/api/package.json`:

```json
"db:backfill-transcodes": "tsx src/scripts/backfill-transcodes.ts"
```

- [ ] **Step 4: Verify green.** Run `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- backfill-transcodes`. All 3 assertions must pass.

- [ ] **Step 5: Execute on dev DB.** After AWS EventBridge is set up (§5):

```bash
cd apps/api
npm run db:backfill-transcodes -- --limit=10     # dry run first
npm run db:backfill-transcodes -- --apply --limit=10  # apply a small batch
# Monitor MediaConvert console for the 10 jobs. Wait 30 min.
# Check DB: SELECT id, transcodeStatus, video720pUrl FROM content_media WHERE ...;
# If variant URLs populated → scale up:
npm run db:backfill-transcodes -- --apply --limit=10000
```

**Why does this matter?** Production has existing reels. Without backfill, early users still see the raw upload even after M0.3 ships. Backfilling fixes them in one batch.

---

### Task M0.6 — End-to-end smoke test (manual + automated)

- [ ] **Automated.** Add one end-to-end Vitest in `apps/api/tests/integration/pipeline.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { fakeMediaConvertCompletionEvent } from '../helpers/streaming.js';
import * as transcodeService from '../../src/services/transcodeService.js';

describe('End-to-end pipeline: upload → transcode → webhook → feed', () => {
  let app: Awaited<ReturnType<typeof getTestApp>>;
  const SECRET = 'test-secret';

  beforeAll(async () => {
    process.env.MEDIACONVERT_WEBHOOK_SECRET = SECRET;
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';
    app = await getTestApp();
  });
  afterAll(async () => closeTestApp(app));
  beforeEach(async () => { await cleanupTestData(); });

  it('full pipeline: create content → triggerTranscode spied → webhook populates variants', async () => {
    const user = await seedUser('dev-test-e2e');
    const spy = vi.spyOn(transcodeService, 'triggerTranscode').mockResolvedValue(undefined);

    // 1. User pre-uploads media
    const media = await prisma.contentMedia.create({
      data: {
        contentId: '00000000-0000-0000-0000-000000000000',
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-e2e.mov',
        width: 1080, height: 1920, transcodeStatus: 'pending',
      },
    });

    // 2. Create content — triggerTranscode called
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { authorization: devToken('dev-test-e2e') },
      payload: { type: 'reel', text: '', mediaIds: [media.id], hashtags: [] },
    });
    expect(createRes.statusCode).toBe(201);
    expect(spy).toHaveBeenCalled();

    // 3. Simulate EventBridge completion event
    const webhookRes = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/dev-test-e2e'),
    });
    expect(webhookRes.statusCode).toBe(200);

    // 4. Verify variants populated
    const after = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(after?.transcodeStatus).toBe('complete');
    expect(after?.video720pUrl).toMatch(/cdn\.eru\.test\/transcoded\/dev-test-e2e_720p\.mp4/);

    spy.mockRestore();
  });
});
```

- [ ] **Manual.** (On a staging or dev build, NOT Expo Go, after AWS EventBridge is configured.)
  1. Log into the app as a dev user.
  2. Upload a real 30s video via the Create tab.
  3. Open the reels tab; find your new video; tap play.
  4. **Expected within 30–60s:** CloudWatch shows MediaConvert job started, then completed. Railway logs show `POST /webhooks/mediaconvert` with 200. DB row updated. Refreshing the reel plays the 720p MP4 (verified by inspecting the video element's src via `adb shell dumpsys activity top` or the dev tools).
  5. **Fallback verification:** If AWS not yet configured, verify `triggerTranscode` was called by tailing Railway logs.

## 7. Verification (success criteria)

A pilot session is shippable when:

- [ ] All 20+ new Vitest assertions green in `apps/api`.
- [ ] All 3 new Jest assertions green in `apps/mobile`.
- [ ] `packages/shared` test suite green.
- [ ] Full `apps/api` suite green (expect the documented cleanup-flake list to re-run individually if they fail).
- [ ] `npx tsc --noEmit` green in both apps.
- [ ] Real MediaConvert job fires on content create (manual staging test).
- [ ] Webhook receives real EventBridge event, DB row updates.
- [ ] Backfill script dry-run prints a sensible candidate count on production (NOT yet applied — that's a separate ops gate with founder approval).
- [ ] Mobile reels.tsx plays the 720p variant URL (confirmed via debugger or network tab).

## 8. What could go wrong

- **EventBridge → API Destination silently drops events.** Indian Railway SSL cert might be rejected if the CA is old, or connection header auth might be misconfigured. **Detection:** CloudWatch Events metrics — look at `Invocations` vs `FailedInvocations` for the rule. **Fix:** Double-check API Destination connection arn in the target. **Fallback:** enable an SQS dead-letter queue on the target (`--dead-letter-config Arn=<sqs-arn>`).

- **MediaConvert account-level throttling.** New AWS accounts have a concurrent-jobs limit as low as 20 on the default queue. If you backfill 10,000 old reels at once, the queue will backlog for hours. **Fix:** `--limit=100` per batch; wait for queue drain between batches.

- **S3 permission issue on the output path.** MediaConvert role (`MEDIACONVERT_ROLE_ARN`) must have `s3:PutObject` on the `transcoded/*` prefix. **Detection:** jobs fail with `ERROR` status and error message `NO_WRITE_PERMISSION`. **Fix:** update the IAM role policy.

- **Webhook idempotency.** EventBridge may deliver the same event twice. The test at M0.2 covers this, but if the `handleTranscodeComplete` service is ever changed to non-idempotent operations (e.g., charging a user per transcode), the assumption breaks. **Invariant to preserve:** `handleTranscodeComplete` must be idempotent forever.

- **Backfill script runs before EventBridge is wired.** Jobs fire, complete, nothing updates the DB. Rows stay at `transcodeStatus='processing'` forever. **Fix:** order of operations in §5: EventBridge FIRST, backfill SECOND.

- **Mid-migration incident: MediaConvert deleted during rollback.** If we roll back the Railway deploy but leave AWS resources, jobs fire but the webhook 404s. Harmless (rows stay processing until the next deploy), but visible in logs. **Fix:** rollback plan in §9.

## 9. Rollback

**If webhook is broken after deploy:**

1. Comment out the `contentMedia.findMany + triggerTranscode loop` in `content.ts`. Deploy. New uploads stop firing jobs. Old uploads untouched.
2. Keep the webhook route deployed (it's idempotent and harmless).
3. Investigate.

**If EventBridge rule is firing wrong payloads:**

1. In AWS console: disable the rule (`aws events disable-rule --name eru-mediaconvert-completion`). No more webhook calls.
2. MediaConvert jobs continue to fire from `/content/create` but the DB doesn't learn about completions — rows stay at `processing`. Harmless.
3. Re-enable rule after fixing.

**If the mobile app breaks because of `pickVideoUrl`:**

1. Revert the two lines in `reels.tsx` and `PostCard.tsx`.
2. Ship a hotfix bundle via EAS Update.
3. Keep server-side changes intact — they're safe in isolation.

**No data loss in any rollback path.** The only state mutation is `contentMedia.transcodeStatus` and the four URL columns; reverting code leaves those columns populated, and `pickVideoUrl` gracefully falls back to `originalUrl`.

## 10. AWS cost delta for M0

Assumptions: 1,000 reels/day at 30s average length, 720p source resolution.

| Line item | Monthly cost |
|---|---|
| MediaConvert (3 output × 30s × 1,000/day × 30 days × $0.0075 per output-minute) | ~$100 |
| S3 storage of transcoded MP4s (~5 MB × 3 outputs × 1,000/day × 30 days = 450 GB stored rolling) | ~$10 |
| S3 egress to CloudFront (assumes 5× views per reel, 5 MB per view) | covered by CF |
| EventBridge events | <$1 |
| API Destination invocations | <$1 |
| **Total** | **~$110/month** |

This scales linearly with upload volume. At 10,000 reels/day (10× growth): ~$1,100/month.

## 11. Duration estimate

- Task M0.1 (shared helper): 2–3 hours
- Task M0.2 (webhook): 4–6 hours
- Task M0.3 (wire triggerTranscode): 3–4 hours
- Task M0.4 (mobile adoption): 2–3 hours
- Task M0.5 (backfill script): 3–4 hours
- Task M0.6 (E2E smoke): 2–3 hours
- AWS EventBridge setup + staging validation: 4–8 hours
- Buffer for surprises (IAM permissions, API Destination quirks): 4–8 hours

**Total:** 24–39 hours = **3–5 working days** for one agent doing TDD properly.

## 12. Dependencies

- **Blocks:** M1 (HLS migration assumes webhook routing and `pickVideoUrl` exist).
- **Blocked by:** nothing. Ready to start now.
- **AWS prerequisite:** `MEDIACONVERT_ROLE_ARN` already set in `apps/api/.env`. IAM role must grant `s3:PutObject` on the transcoded prefix.

## 13. Next milestone

Once M0 ships and passes the verification checklist, proceed to [M1 — HLS Migration](M1-hls-migration.md).
