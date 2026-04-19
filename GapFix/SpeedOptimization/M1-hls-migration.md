# M1 — HLS Migration

> **For agentic workers:** REQUIRED SUB-SKILLS: `superpowers:executing-plans`, `superpowers:test-driven-development`, `superpowers:systematic-debugging` (HLS bugs are subtle). **M0 MUST be complete before starting M1.** TDD rules per `GapFix/SpeedOptimization.md#7-tdd-protocol-agent-first`.

## 1. Goal (plain language)

Switch MediaConvert from emitting three standalone MP4 files to emitting a single HLS manifest with five quality rungs (240p through 1080p) and 4-second segments. The mobile player's ExoPlayer/AVPlayer uses the manifest to adapt quality mid-playback. Legacy MP4 rows keep serving for older content until naturally supplanted or backfilled.

## 2. Analogy

The kitchen-dumbwaiter system now works (M0). M1 replaces every "whole roast chicken" on the menu (progressive MP4) with a tapas flight of five small plates (HLS segments) at different spice levels (bitrates). Diners get their first bite in seconds. If the spice (bandwidth) changes mid-meal, the waiter swaps to a milder or stronger plate without the diner noticing.

## 3. Why we need this

**What breaks without it:**

- First reel after tapping play: user waits ~2s on 720p MP4 because the player must download the mdat box (video data) before it can start. On HLS, the player downloads a 4-second segment (~1 MB for 720p) and starts immediately.
- Swiping to next reel while on a crowded Jio tower: the 720p MP4 can't downshift mid-playback. HLS can — on a 2s segment the player ABRs down to 360p seamlessly.
- Bandwidth waste when the user is on a laptop-tethered wifi but the signal is weak: MP4 always serves 720p. HLS would detect slow chunk downloads and drop to 540p.

**Why it's the "main event":** Every TikTok/Instagram reel in the world uses HLS or CMAF. Without it, Eru's streaming experience caps at what YouTube had in 2011. With it, we're on the 2026 industry baseline.

## 4. HLS vs CMAF — decision and reasoning

**Decision: HLS for MVP. Revisit CMAF after 3 months of HLS production data.**

| Factor | HLS (m3u8 + .ts) | CMAF (m3u8 + fragmented mp4) | Eru's pick |
|---|---|---|---|
| expo-video (ExoPlayer + AVPlayer) maturity | Both engines ship with years of HLS hardening | CMAF via iOS 14+ / ExoPlayer 2.15+ works but less field-proven on low-end Androids | HLS — less risk on Redmi 10C–class devices |
| MediaConvert config complexity | HLS_GROUP_SETTINGS, well-documented, many AWS sample configs | CMAF_GROUP_SETTINGS, newer, fewer examples | HLS |
| Low-latency advantage (LL-HLS or LL-DASH) | Not applicable to VOD | Valuable for LIVE streams | Irrelevant for Eru reels |
| Single-encode-dual-manifest (HLS + DASH) | No — DASH would be a second encode | Yes — one encode, two playlists | Eru doesn't need DASH today; CMAF win is deferred |
| CDN cacheability | .ts segments cache indefinitely | fragmented mp4 also caches well | Tie |
| Byte-range request overhead | .ts files are self-contained | CMAF uses byte-range within larger mp4 fragments — slightly more efficient bandwidth but more complex CDN config | HLS simpler |

**When to revisit CMAF:** (a) we need to support DASH (unlikely Phase 1–2, possible if we ever ship a web reels viewer), (b) field data shows CMAF measurably reduces rebuffering on Android 4G, (c) MediaConvert pricing for CMAF drops below HLS.

## 5. Bitrate ladder — decision

**5 rungs: 240p / 360p / 540p / 720p / 1080p.**

| Rung | Resolution | Video bitrate | Target network | Why included |
|---|---|---|---|---|
| 240p | 426×240 | 400 kbps | Peak-hour Jio/Airtel 4G (often <500 kbps) | Without this rung, ABR gives up and rebuffers. TikTok has an equivalent rung for India. |
| 360p | 640×360 | 800 kbps | Regular 4G | Current lowest — kept |
| 540p | 960×540 | 1,400 kbps | Fast 4G | New rung. Fills the 360→720 gap where ExoPlayer would otherwise thrash between the two |
| 720p | 1280×720 | 2,500 kbps | Wifi or 5G | Current default — kept |
| 1080p | 1920×1080 | 5,000 kbps | Wifi only | Opt-in via `pickVideoUrl(m, { allow1080p: true })` in M3 preload |

Audio: single AAC 128 kbps track (not ladderised). Stored alongside the ladder via `AudioDescriptions`.

**Why 5 rungs and not 3:** Two reasons. (1) Indian 4G is not homogeneous — Jio peaks at 30 Mbps but fluctuates to 500 kbps under tower load. A three-rung 360/720/1080 ladder means every fluctuation triggers a visible quality change. Five rungs smooth the transitions. (2) MediaConvert per-minute pricing is linear with rung count; adding two rungs costs ~50% more, but bandwidth saved from ABR working properly offsets it.

**Why not 4K (2160p):** Mobile displays max at 1080p. 4K is a CDN bill hit with zero visible benefit. We add it only if we ship a web reels viewer on desktops.

## 6. Segment duration — decision

**4-second segments.**

| Segment length | TTFF (target) | CDN cache efficiency | Storage overhead | Verdict |
|---|---|---|---|---|
| 2s | ~600ms (fastest) | Good (larger playlist, more segments to cache) | Higher (each segment has TS header overhead) | Too many HTTP requests at scale |
| 4s | ~1.2s | Good | Moderate | **Chosen** |
| 6s | ~1.8s (slowest) | Best (fewer, larger segments cache better) | Lowest overhead | TTFF too slow for reels |

4s balances TTFF against CDN request count. Industry default for VOD.

## 7. expo-video vs react-native-video — decision

**Keep expo-video 3.0.16. Document migration triggers.**

expo-video uses:
- iOS: AVPlayer (native HLS engine, excellent ABR)
- Android: ExoPlayer (battle-tested HLS, including for TikTok-class apps)

ABR happens natively — no tuning required for MVP.

**Migration triggers to react-native-video** (only if all three fire):

1. Field rebuffer data shows ABR decisions consistently pick too-high a bitrate (seen in M5's Sentry data as abr_switch_down events clustered at segment boundaries).
2. Need to control cache size/eviction beyond expo-video's defaults.
3. Need pre-roll ads or DRM (neither in current Phase 1 scope).

Until those fire, expo-video is the boring safe choice. When we need to migrate, it's a 1–2 day swap because `pickVideoUrl` already abstracts the URL source.

## 8. Files to modify

| File | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Add `hlsManifestUrl String? @map("hls_manifest_url")` to `ContentMedia` model; add `video540pUrl String? @map("video_540p_url")` and `video240pUrl String? @map("video_240p_url")` for completeness |
| `apps/api/src/services/transcodeService.ts` | Rewrite `triggerTranscode` to use `HLS_GROUP_SETTINGS`; update `handleTranscodeComplete` to accept an HLS payload and set `hlsManifestUrl` |
| `apps/api/src/routes/webhooks.ts` | Extract HLS-specific output paths from EventBridge event; keep MP4 branch for any still-in-flight legacy jobs |
| `apps/api/tests/helpers/streaming.ts` | Extend `fakeMediaConvertCompletionEvent` to build HLS-style events |
| `packages/shared/src/media.ts` | Already handles `hlsManifestUrl` from M0; add `video540pUrl` + `video240pUrl` to the interface |
| `packages/shared/src/media.test.ts` | Extend with 540p and 240p coverage |
| `apps/mobile/app/(tabs)/reels.tsx` | No logic change — `pickVideoUrl` already prefers HLS |
| `apps/mobile/components/PostCard.tsx` | No logic change — same |
| `apps/mobile/__tests__/...` | Add a test asserting `pickVideoUrl` returns the HLS manifest URL when present, and that expo-video plays it |
| `apps/api/src/scripts/backfill-hls.ts` | **NEW (optional)** — re-transcode existing MP4-only content to HLS |

## 9. Ordered TDD tasks

### Task M1.1 — Schema change

- [ ] **Step 1: Failing test.** Add to `apps/api/tests/schema/content-media-schema.test.ts` (create if not existing):

```typescript
import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';

describe('ContentMedia schema supports HLS and extended ladder', () => {
  it('accepts hlsManifestUrl + video540pUrl + video240pUrl', async () => {
    const user = await prisma.user.create({ data: {
      firebaseUid: 'dev-test-schema1', email: 'dev-test-schema1@eru.test', name: 'test', username: 'schema1',
    }});
    const content = await prisma.content.create({ data: { userId: user.id, type: 'reel' }});
    const media = await prisma.contentMedia.create({
      data: {
        contentId: content.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/s1.mov',
        width: 1080, height: 1920,
        hlsManifestUrl: 'https://cdn/master.m3u8',
        video240pUrl: 'https://cdn/240p.mp4',
        video540pUrl: 'https://cdn/540p.mp4',
      },
    });
    expect(media.hlsManifestUrl).toBe('https://cdn/master.m3u8');
    expect(media.video240pUrl).toBeDefined();
    expect(media.video540pUrl).toBeDefined();
    await prisma.contentMedia.delete({ where: { id: media.id }});
    await prisma.content.delete({ where: { id: content.id }});
    await prisma.user.delete({ where: { id: user.id }});
  });
});
```

- [ ] **Step 2: Schema change.** Edit `apps/api/prisma/schema.prisma` `ContentMedia` model to add:

```prisma
  video240pUrl    String?         @map("video_240p_url")
  video540pUrl    String?         @map("video_540p_url")
  hlsManifestUrl  String?         @map("hls_manifest_url")
```

- [ ] **Step 3: Apply to DB.**

```bash
cd apps/api
npx prisma db push
npx prisma generate
```

Remember: this project uses `db push`, NOT `migrate dev` (see `apps/api/CLAUDE.md`).

- [ ] **Step 4: Verify green.** Run `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- content-media-schema`. Pass.

### Task M1.2 — Extend `pickVideoUrl` for 540p + 240p

- [ ] **Step 1: Failing test.** Append to `packages/shared/src/media.test.ts`:

```typescript
describe('pickVideoUrl — extended ladder', () => {
  it('prefers 540p over 360p', () => {
    expect(pickVideoUrl({
      video360pUrl: 'https://cdn/360.mp4',
      video540pUrl: 'https://cdn/540.mp4',
    })).toBe('https://cdn/540.mp4');
  });

  it('prefers 720p over 540p', () => {
    expect(pickVideoUrl({
      video540pUrl: 'https://cdn/540.mp4',
      video720pUrl: 'https://cdn/720.mp4',
    })).toBe('https://cdn/720.mp4');
  });

  it('240p is fallback below 360p', () => {
    expect(pickVideoUrl({ video240pUrl: 'https://cdn/240.mp4' })).toBe('https://cdn/240.mp4');
    expect(pickVideoUrl({
      video240pUrl: 'https://cdn/240.mp4',
      video360pUrl: 'https://cdn/360.mp4',
    })).toBe('https://cdn/360.mp4');
  });

  it('still prefers HLS manifest when both HLS and MP4 rungs present', () => {
    expect(pickVideoUrl({
      hlsManifestUrl: 'https://cdn/master.m3u8',
      video240pUrl: 'https://cdn/240.mp4',
      video540pUrl: 'https://cdn/540.mp4',
    })).toBe('https://cdn/master.m3u8');
  });
});
```

- [ ] **Step 2: Extend implementation.** Update `packages/shared/src/media.ts` to include the 5-rung interface + fall-through order (240 is bottom-of-fallback; see M0 for the pattern). Full listing in the M0 task M0.1; add `video240pUrl` and `video540pUrl` to the `PickableMedia` interface and insert fall-through branches into `pickVideoUrl` between 360p and original, and between 720p and 360p respectively.

- [ ] **Step 3: Verify green.** `cd packages/shared && npm test`.

### Task M1.3 — Rewrite `triggerTranscode` to emit HLS

- [ ] **Step 1: Failing test.** Create `apps/api/tests/services/transcodeService-hls.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerTranscode } from '../../src/services/transcodeService.js';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

vi.mock('@aws-sdk/client-mediaconvert', () => {
  const send = vi.fn().mockResolvedValue({ Job: { Id: 'test-job-id' } });
  return {
    MediaConvertClient: vi.fn().mockImplementation(() => ({ send })),
    CreateJobCommand: vi.fn().mockImplementation((input) => ({ input })),
    __send: send,
  };
});

vi.mock('../../src/utils/prisma.js', () => ({
  prisma: {
    contentMedia: { update: vi.fn().mockResolvedValue({}) },
  },
}));

describe('triggerTranscode — HLS output', () => {
  beforeEach(() => {
    process.env.MEDIACONVERT_ROLE_ARN = 'arn:aws:iam::0:role/test';
    process.env.S3_BUCKET = 'test-bucket';
    process.env.AWS_REGION = 'ap-south-1';
    vi.clearAllMocks();
  });

  it('emits an HLS_GROUP_SETTINGS job with 5 output rungs (240p/360p/540p/720p/1080p)', async () => {
    await triggerTranscode('media-abc', 'originals/dev-test-hls.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const settings = call.input.Settings;

    const hlsGroup = settings.OutputGroups[0];
    expect(hlsGroup.OutputGroupSettings.Type).toBe('HLS_GROUP_SETTINGS');
    expect(hlsGroup.OutputGroupSettings.HlsGroupSettings.SegmentLength).toBe(4);

    const rungs = hlsGroup.Outputs.map((o: { NameModifier: string }) => o.NameModifier);
    expect(rungs).toEqual(['_240p', '_360p', '_540p', '_720p', '_1080p']);
  });

  it('uses M3U8 container on each rung', async () => {
    await triggerTranscode('media-def', 'originals/dev-test-hls2.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const outputs = call.input.Settings.OutputGroups[0].Outputs;
    for (const o of outputs) {
      expect(o.ContainerSettings.Container).toBe('M3U8');
    }
  });

  it('bitrate ladder matches ladder decision', async () => {
    await triggerTranscode('media-ghi', 'originals/dev-test-hls3.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const outputs = call.input.Settings.OutputGroups[0].Outputs;
    const bitrates = outputs.map((o: { VideoDescription: { CodecSettings: { H264Settings: { Bitrate: number }}}}) =>
      o.VideoDescription.CodecSettings.H264Settings.Bitrate);
    expect(bitrates).toEqual([400000, 800000, 1400000, 2500000, 5000000]);
  });

  it('destination is under transcoded/<baseName>/ prefix', async () => {
    await triggerTranscode('media-jkl', 'originals/dev-test-hls4.mov');

    const sdk = await import('@aws-sdk/client-mediaconvert') as unknown as { __send: ReturnType<typeof vi.fn> };
    const call = sdk.__send.mock.calls[0][0];
    const dest = call.input.Settings.OutputGroups[0].OutputGroupSettings.HlsGroupSettings.Destination;
    expect(dest).toMatch(/^s3:\/\/test-bucket\/transcoded\/dev-test-hls4\/$/);
  });
});
```

- [ ] **Step 2: Implement HLS output.** Replace `apps/api/src/services/transcodeService.ts` `triggerTranscode` body with:

```typescript
export async function triggerTranscode(mediaId: string, s3Key: string): Promise<void> {
  if (!process.env.MEDIACONVERT_ROLE_ARN) {
    await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { transcodeStatus: 'complete' },
    });
    return;
  }

  const bucket = process.env.S3_BUCKET!;
  const baseName = s3Key.replace(/^originals\//, '').replace(/\.[^/.]+$/, '');
  const outputPrefix = `transcoded/${baseName}/`;

  const command = new CreateJobCommand({
    Role: process.env.MEDIACONVERT_ROLE_ARN,
    Settings: {
      Inputs: [{
        FileInput: `s3://${bucket}/${s3Key}`,
        AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
      }],
      OutputGroups: [{
        Name: 'HLS',
        OutputGroupSettings: {
          Type: 'HLS_GROUP_SETTINGS',
          HlsGroupSettings: {
            Destination: `s3://${bucket}/${outputPrefix}`,
            SegmentLength: 4,
            MinSegmentLength: 0,
            ManifestCompression: 'NONE',
            ManifestDurationFormat: 'INTEGER',
            StreamInfResolution: 'INCLUDE',
            DirectoryStructure: 'SINGLE_DIRECTORY',
            CodecSpecification: 'RFC_4281',
            ProgramDateTime: 'EXCLUDE',
          },
        },
        Outputs: [
          createHlsOutput('_240p', 426, 240, 400_000),
          createHlsOutput('_360p', 640, 360, 800_000),
          createHlsOutput('_540p', 960, 540, 1_400_000),
          createHlsOutput('_720p', 1280, 720, 2_500_000),
          createHlsOutput('_1080p', 1920, 1080, 5_000_000),
        ],
      }],
    },
    UserMetadata: { mediaId },
  });

  try {
    await getClient().send(command);
    await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { transcodeStatus: 'processing' },
    });
  } catch (err) {
    console.warn('MediaConvert unavailable, skipping transcode for media', mediaId, err instanceof Error ? err.message : err);
    await prisma.contentMedia.update({
      where: { id: mediaId },
      data: { transcodeStatus: 'complete' },
    });
  }
}

function createHlsOutput(suffix: string, width: number, height: number, bitrate: number) {
  return {
    NameModifier: suffix,
    ContainerSettings: {
      Container: 'M3U8' as const,
      M3u8Settings: {
        AudioFramesPerPes: 4,
        Scte35Source: 'NONE' as const,
        PcrControl: 'PCR_EVERY_PES_PACKET' as const,
      },
    },
    VideoDescription: {
      Width: width,
      Height: height,
      CodecSettings: {
        Codec: 'H_264' as const,
        H264Settings: {
          RateControlMode: 'CBR' as const,
          Bitrate: bitrate,
          MaxBitrate: bitrate,
          GopSize: 96,        // 4s × 24fps; aligns GOP to segment
          GopSizeUnits: 'FRAMES' as const,
        },
      },
    },
    AudioDescriptions: [{
      AudioSourceName: 'Audio Selector 1',
      CodecSettings: {
        Codec: 'AAC' as const,
        AacSettings: { Bitrate: 128000, CodingMode: 'CODING_MODE_2_0' as const, SampleRate: 48000 },
      },
    }],
    OutputSettings: {
      HlsSettings: { SegmentModifier: '' },
    },
  };
}
```

Line-by-line on the key HLS-specific bits:

- `SegmentLength: 4` → each .ts segment is 4 seconds of video; see §6.
- `DirectoryStructure: 'SINGLE_DIRECTORY'` → all segments for all rungs land in the same prefix, e.g. `transcoded/<baseName>/240p_00001.ts` alongside `720p_00001.ts`. Simpler CDN cache keys.
- `CodecSpecification: 'RFC_4281'` → how codec info is written into the master manifest; RFC_4281 is the modern format and required by most ExoPlayer builds.
- `GopSize: 96` (96 frames at 24fps = 4 seconds) → ensures every 4-second segment starts on an I-frame so ABR switches are seamless. Without this, a player switching mid-segment would see a glitch.
- `SegmentModifier: ''` → no custom filename modifier; MediaConvert uses the NameModifier (`_240p`, etc.) as the segment prefix.

- [ ] **Step 3: Verify green.** Run `cd apps/api && ALLOW_DEV_TOKENS=true npm test -- transcodeService-hls`. All 4 assertions pass.

### Task M1.4 — Update `handleTranscodeComplete` to set `hlsManifestUrl`

- [ ] **Step 1: Failing test.** Append to `apps/api/tests/services/transcodeService-hls.test.ts`:

```typescript
describe('handleTranscodeComplete — HLS', () => {
  it('sets hlsManifestUrl and all five rung URLs when given an HLS output', async () => {
    const { handleTranscodeComplete } = await import('../../src/services/transcodeService.js');
    const prismaModule = await import('../../src/utils/prisma.js');
    const updateSpy = prismaModule.prisma.contentMedia.update as unknown as ReturnType<typeof vi.fn>;
    updateSpy.mockClear();
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';

    await handleTranscodeComplete('media-xyz', {
      hlsManifest: 'transcoded/abc/master.m3u8',
      p240: 'transcoded/abc/240p.m3u8',
      p360: 'transcoded/abc/360p.m3u8',
      p540: 'transcoded/abc/540p.m3u8',
      p720: 'transcoded/abc/720p.m3u8',
      p1080: 'transcoded/abc/1080p.m3u8',
    });

    expect(updateSpy).toHaveBeenCalledWith({
      where: { id: 'media-xyz' },
      data: {
        transcodeStatus: 'complete',
        hlsManifestUrl: 'https://cdn.eru.test/transcoded/abc/master.m3u8',
        video240pUrl: 'https://cdn.eru.test/transcoded/abc/240p.m3u8',
        video360pUrl: 'https://cdn.eru.test/transcoded/abc/360p.m3u8',
        video540pUrl: 'https://cdn.eru.test/transcoded/abc/540p.m3u8',
        video720pUrl: 'https://cdn.eru.test/transcoded/abc/720p.m3u8',
        video1080pUrl: 'https://cdn.eru.test/transcoded/abc/1080p.m3u8',
      },
    });
  });
});
```

- [ ] **Step 2: Update implementation.** Replace `handleTranscodeComplete` in `transcodeService.ts`:

```typescript
export async function handleTranscodeComplete(
  mediaId: string,
  outputKeys: {
    hlsManifest: string;
    p240?: string;
    p360: string;
    p540?: string;
    p720: string;
    p1080: string;
  },
): Promise<void> {
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;
  const toUrl = (k?: string) => k ? `https://${cdnDomain}/${k}` : undefined;

  await prisma.contentMedia.update({
    where: { id: mediaId },
    data: {
      transcodeStatus: 'complete',
      hlsManifestUrl: toUrl(outputKeys.hlsManifest),
      video240pUrl: toUrl(outputKeys.p240),
      video360pUrl: toUrl(outputKeys.p360),
      video540pUrl: toUrl(outputKeys.p540),
      video720pUrl: toUrl(outputKeys.p720),
      video1080pUrl: toUrl(outputKeys.p1080),
    },
  });
}
```

Note: in HLS mode the "720p URL" stored in `video720pUrl` is actually the 720p variant *.m3u8* playlist, not a standalone MP4. This is fine because expo-video can play either a master manifest OR a variant manifest — picking a variant m3u8 disables ABR and locks to that rung, which is a useful fallback if the master manifest fails.

- [ ] **Step 3: Verify green.**

### Task M1.5 — Update webhook to parse HLS event output paths

- [ ] **Step 1: Failing test.** Append to `apps/api/tests/routes/webhooks.test.ts`:

```typescript
describe('POST /webhooks/mediaconvert — HLS output', () => {
  it('parses HLS output group and populates hlsManifestUrl + rungs', async () => {
    const user = await seedUser('dev-test-wh6');
    const content = await seedContent({ userId: user.id, type: 'reel' });
    const media = await seedPendingVideoMedia({ userId: user.id, contentId: content.id });

    const hlsEvent = {
      version: '0',
      source: 'aws.mediaconvert',
      'detail-type': 'MediaConvert Job State Change',
      detail: {
        status: 'COMPLETE',
        userMetadata: { mediaId: media.id },
        outputGroupDetails: [{
          type: 'HLS_GROUP',
          playlistFilePaths: [`s3://bucket/transcoded/hlstest/master.m3u8`],
          outputDetails: [
            { outputFilePaths: [`s3://bucket/transcoded/hlstest/240p.m3u8`] },
            { outputFilePaths: [`s3://bucket/transcoded/hlstest/360p.m3u8`] },
            { outputFilePaths: [`s3://bucket/transcoded/hlstest/540p.m3u8`] },
            { outputFilePaths: [`s3://bucket/transcoded/hlstest/720p.m3u8`] },
            { outputFilePaths: [`s3://bucket/transcoded/hlstest/1080p.m3u8`] },
          ],
        }],
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: hlsEvent,
    });

    expect(res.statusCode).toBe(200);
    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.hlsManifestUrl).toMatch(/master\.m3u8$/);
    expect(updated?.video720pUrl).toMatch(/720p\.m3u8$/);
    expect(updated?.video240pUrl).toMatch(/240p\.m3u8$/);
  });
});
```

- [ ] **Step 2: Update the webhook.** Edit `apps/api/src/routes/webhooks.ts`:

```typescript
    if (event.detail?.status === 'COMPLETE') {
      const group = event.detail.outputGroupDetails?.[0];
      const isHls = group?.type === 'HLS_GROUP' || (group?.playlistFilePaths?.[0]?.endsWith('.m3u8') ?? false);

      if (isHls) {
        const masterPath = group!.playlistFilePaths![0].replace(/^s3:\/\/[^/]+\//, '');
        const variantPaths = (group!.outputDetails ?? [])
          .map(o => o.outputFilePaths?.[0]?.replace(/^s3:\/\/[^/]+\//, ''))
          .filter((k): k is string => typeof k === 'string');

        const p240 = variantPaths.find(p => p.includes('240p'));
        const p360 = variantPaths.find(p => p.includes('360p'));
        const p540 = variantPaths.find(p => p.includes('540p'));
        const p720 = variantPaths.find(p => p.includes('720p'));
        const p1080 = variantPaths.find(p => p.includes('1080p'));

        if (!p360 || !p720 || !p1080) {
          throw Errors.badRequest('Missing required HLS rungs (360/720/1080)');
        }
        await handleTranscodeComplete(mediaId, { hlsManifest: masterPath, p240, p360, p540, p720, p1080 });
      } else {
        // Legacy MP4 branch — kept to drain in-flight pre-M1 jobs
        const keys = (group?.outputDetails ?? [])
          .map(o => o.outputFilePaths?.[0]?.replace(/^s3:\/\/[^/]+\//, ''))
          .filter((k): k is string => typeof k === 'string');
        const p360 = keys.find(k => k.includes('_360p'));
        const p720 = keys.find(k => k.includes('_720p'));
        const p1080 = keys.find(k => k.includes('_1080p'));
        if (!p360 || !p720 || !p1080) {
          throw Errors.badRequest('Incomplete output set from legacy MediaConvert');
        }
        await handleTranscodeComplete(mediaId, { hlsManifest: '', p360, p720, p1080 });
      }
    }
```

Note: the MP4 branch passes `hlsManifest: ''` which makes `toUrl('')` return `undefined` (falsy), leaving `hlsManifestUrl` null. Legacy rows stay MP4.

- [ ] **Step 3: Verify green.** Run webhook tests; both HLS and legacy MP4 tests pass.

### Task M1.6 — Mobile verification

- [ ] **Step 1: Failing test.** Add to `apps/mobile/__tests__/screens/reels-hls.test.tsx`:

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import Reels from '@/app/(tabs)/reels';

jest.mock('expo-video', () => ({
  useVideoPlayer: (source: unknown) => ({ source, play: jest.fn(), pause: jest.fn() }),
  VideoView: ({ player }: { player: { source: unknown } }) =>
    <div data-testid="videoview" data-source={JSON.stringify(player.source)} />,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/services/contentService', () => ({
  getReels: jest.fn().mockResolvedValue({
    items: [{
      id: 'r1', type: 'reel', text: '',
      media: [{
        originalUrl: 'https://cdn/original.mov',
        video720pUrl: 'https://cdn/720.m3u8',
        hlsManifestUrl: 'https://cdn/master.m3u8',
      }],
      user: { id: 'u1', name: 'Test', username: 'test', avatarUrl: null, isVerified: false, tier: 'bronze' },
    }],
    page: 1, limit: 10, total: 1,
  }),
}));
jest.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: unknown) => (sel as (s: unknown) => unknown)({ user: { id: 'u-me' } }),
}));

describe('Reels uses HLS manifest when present', () => {
  it('prefers hlsManifestUrl over video720pUrl', async () => {
    const { findByTestId } = render(<Reels />);
    const view = await findByTestId('videoview');
    const source = JSON.parse(view.props['data-source']);
    expect(source).toEqual(expect.objectContaining({ uri: 'https://cdn/master.m3u8' }));
  });
});
```

- [ ] **Step 2: No implementation change needed** — `pickVideoUrl` already prefers HLS.

- [ ] **Step 3: Manual test.** Upload a real video on a staging build; wait for the MediaConvert HLS job to finish (~60s for a 30s clip); open reels; inspect player source via dev tools. Should be a .m3u8 URL. Play a 30s clip and use Android Studio's Network Profiler (or Charles Proxy) to verify sequential .ts segment downloads at the ladder rung matching current bandwidth.

### Task M1.7 — HLS backfill script (optional, run after M1 ships stable)

- [ ] **Step 1: Failing test.** Create `apps/api/tests/scripts/backfill-hls.test.ts`. Mirror the M0.5 backfill test but with the filter `hlsManifestUrl IS NULL AND video720pUrl IS NOT NULL` (i.e., MP4-only rows that need re-transcoding to HLS).

- [ ] **Step 2: Implement.** Create `apps/api/src/scripts/backfill-hls.ts` as a near-copy of `backfill-transcodes.ts` but with that WHERE clause. The `triggerTranscode` call is the same — M1's implementation emits HLS, so the re-run populates `hlsManifestUrl`.

- [ ] **Step 3: Apply in staged batches of 100.** Wait for MediaConvert queue drain between batches (~15 min for 100 jobs). Track progress via a simple SQL query:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE "hls_manifest_url" IS NULL AND "video_720p_url" IS NOT NULL) AS mp4_only,
    COUNT(*) FILTER (WHERE "hls_manifest_url" IS NOT NULL) AS hls_present
  FROM content_media WHERE type = 'video';
  ```

## 10. What could go wrong

- **ExoPlayer can't play certain HLS manifests on Android 10 or older.** The most common cause: H.264 Main profile used while device only supports Baseline. MediaConvert's H264Settings defaults to Main; we should pin `H264Settings.CodecProfile: 'HIGH'` for 720p/1080p (modern Android) and `'BASELINE'` for 240p/360p (older devices). **Mitigation:** add a per-rung profile lock in `createHlsOutput`. **Detection:** Sentry events showing HLS manifest parsing errors clustered on specific device models.

- **TS segment download is blocked by corporate/school wifi proxies.** Some Indian networks (college, enterprise wifi) block `.ts` file extensions thinking they're MPEG streams from pirate sites. **Mitigation:** configurable segment file extension via MediaConvert's `SegmentExtension` param (use `.m4s` with CMAF, or keep `.ts` and whitelist via subscriber feedback). Track via Sentry.

- **Master manifest 404 breaks the reel with no fallback.** If CloudFront returns 404 on master.m3u8 (S3 permission bug or wrong path), the reel is dead. **Mitigation:** `pickVideoUrl` already falls through — if mobile can't load the HLS URL, it can retry with `video720pUrl` by catching the `PlayerError` and re-rendering. Add this retry to `reels.tsx`.

- **MediaConvert queue backlog when backfilling.** Default concurrent limit is 20. A backfill of 1,000 rows causes a 50× queue backup. **Mitigation:** run `backfill-hls` in batches of 50 with 10-minute waits.

- **CloudFront signed URLs break with HLS.** If we sign the master.m3u8 URL but not the segment URLs inside it, segments 403. **Mitigation:** either sign with wildcard on the path, or serve HLS unsigned (current default). Revisit when we add premium/private content.

- **Cost surprise.** HLS uses 5 rungs vs MP4's 3 → 67% higher transcode cost per video, plus storage for ~2× the output files. **Mitigation:** the M5 CloudWatch dashboard includes a MediaConvert cost widget; alarm at $500/month.

## 11. Rollback

**If HLS playback fails in production:**

1. **Short fix (minutes):** revert `pickVideoUrl` to skip `hlsManifestUrl`:
   ```typescript
   // commented out temporarily
   // if (media.hlsManifestUrl) return media.hlsManifestUrl;
   ```
   Ship via EAS Update. Mobile immediately falls back to `video720pUrl` (which is the 720p HLS variant manifest — still plays).
2. **Medium fix (hours):** revert `triggerTranscode` to emit MP4 while keeping webhook handling both HLS and MP4 events. New uploads go back to MP4; HLS content stays served (its MP4 rung columns are populated since those are the variant .m3u8 filenames treated as bare URLs).

**If we must fully revert M1:**

1. Revert the schema changes (`hlsManifestUrl`, `video540pUrl`, `video240pUrl`) — run `npx prisma db push` after reverting the schema file. **Warning:** this drops those columns' data, which is fine since they're additive and no other code depends on them.
2. Revert `transcodeService.ts` to the M0-era MP4 output.
3. Revert the webhook HLS branch.
4. Revert the `packages/shared` extended ladder.

**No data loss:** `originalUrl` stays untouched in all scenarios. Users always see *something*.

## 12. AWS cost delta for M1

- MediaConvert: 5 rungs × 30s each × 1,000 uploads/day × 30 days × $0.0075 per output-minute = **~$170/month** (vs M0's $100 → +$70)
- S3 storage: HLS produces 5 variants × ~30 segments of ~100 KB each = ~15 MB per video × 30,000 videos/month × 30-day retention = **~$20/month** (vs M0's $10 → +$10)
- CloudFront egress: unchanged at the byte level (users still download ~5 MB per reel play), but with ABR users download less data on average → **net decrease** of $5–15/month depending on viewer mix.
- **Net M1 delta: +$65 to +$75/month over M0**

## 13. Duration estimate

- M1.1 (schema): 2 hours
- M1.2 (shared helper): 2 hours
- M1.3 (HLS transcode): 6–8 hours (HLS config takes fiddling on first attempt)
- M1.4 (handleTranscodeComplete): 2–3 hours
- M1.5 (webhook HLS parsing): 4–5 hours
- M1.6 (mobile verification): 3–4 hours
- AWS dry-run with a single test video: 2–3 hours (verify output paths and manifest playability in a browser's hls.js before mobile)
- Field test on a real low-end Android: 2–4 hours
- Buffer for codec profile / Android compatibility surprises: 8–12 hours

**Total:** 31–43 hours = **5–7 working days**.

## 14. Dependencies

- **Blocks:** M3 (preloading logic depends on HLS for sub-reel chunk preload).
- **Blocked by:** M0 (all of it).
- **Parallelisable with:** M2 (CDN) can start config work in parallel with late-M1 implementation since CDN changes are additive.

## 15. Next milestone

Once M1 ships and passes the verification checklist, M2/M3/M4/M5 may all start — they're parallelisable. The recommended order by value-per-day: [M3 — Preloading](M3-preloading-caching.md) first (biggest UX improvement), then [M2 — CDN](M2-cdn-edge.md), then [M4 — Startup](M4-startup-bundle.md), then [M5 — Monitoring](M5-monitoring.md) alongside each.
