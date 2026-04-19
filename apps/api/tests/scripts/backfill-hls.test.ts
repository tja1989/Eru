import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';
import { cleanupOrphanTestMedia } from '../helpers/streaming.js';
import * as transcodeService from '../../src/services/transcodeService.js';
import { runHlsBackfill } from '../../src/scripts/backfill-hls.js';

vi.mock('../../src/services/transcodeService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/transcodeService.js')>();
  return {
    ...actual,
    triggerTranscode: vi.fn().mockResolvedValue(undefined),
  };
});

const URL_PREFIX = 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-';
const TEST_FILTER = '/originals/dev-test-';

describe('backfill-hls script', () => {
  beforeEach(async () => {
    vi.mocked(transcodeService.triggerTranscode).mockReset();
    vi.mocked(transcodeService.triggerTranscode).mockResolvedValue(undefined);
    await cleanupTestData();
    await cleanupOrphanTestMedia();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupOrphanTestMedia();
  });

  it('targets MP4-only rows (video720pUrl present, hlsManifestUrl null) and skips already-HLS rows', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-bh1', phone: '+912600000001', username: 'tbh1' });
    const c = await seedContent(u.id, { type: 'reel' });

    const mp4Only = await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}mp4only.mov`,
        width: 1080, height: 1920, transcodeStatus: 'complete',
        video720pUrl: 'https://cdn/720.mp4' },
    });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}hlsdone.mov`,
        width: 1080, height: 1920, transcodeStatus: 'complete',
        video720pUrl: 'https://cdn/720.m3u8',
        hlsManifestUrl: 'https://cdn/master.m3u8' },
    });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}notranscode.mov`,
        width: 1080, height: 1920, transcodeStatus: 'pending' },
    });

    const report = await runHlsBackfill({ dryRun: false, limit: 100, originalUrlFilter: TEST_FILTER });
    expect(report.totalCandidates).toBe(1);
    expect(report.triggered).toBe(1);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledTimes(1);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledWith(mp4Only.id, expect.stringContaining('mp4only.mov'));
  });

  it('dry-run reports count without firing', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-bh2', phone: '+912600000002', username: 'tbh2' });
    const c = await seedContent(u.id, { type: 'reel' });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}dry.mov`,
        width: 1080, height: 1920, transcodeStatus: 'complete',
        video720pUrl: 'https://cdn/720.mp4' },
    });

    const report = await runHlsBackfill({ dryRun: true, limit: 100, originalUrlFilter: TEST_FILTER });
    expect(report.totalCandidates).toBe(1);
    expect(report.triggered).toBe(0);
    expect(transcodeService.triggerTranscode).not.toHaveBeenCalled();
  });
});
