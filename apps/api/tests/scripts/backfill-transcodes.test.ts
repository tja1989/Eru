import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';
import { cleanupOrphanTestMedia } from '../helpers/streaming.js';
import * as transcodeService from '../../src/services/transcodeService.js';
import { runBackfill } from '../../src/scripts/backfill-transcodes.js';

vi.mock('../../src/services/transcodeService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/transcodeService.js')>();
  return {
    ...actual,
    triggerTranscode: vi.fn().mockResolvedValue(undefined),
  };
});

const URL_PREFIX = 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-';
const TEST_FILTER = '/originals/dev-test-';

describe('backfill-transcodes script', () => {
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

  it('fires triggerTranscode for video media with NULL variant URLs', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-bf1', phone: '+912300000001', username: 'tbf1' });
    const c = await seedContent(u.id, { type: 'reel' });

    const m1 = await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}m1.mov`, width: 1080, height: 1920, transcodeStatus: 'pending' },
    });
    const m2 = await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}m2.mov`, width: 1080, height: 1920, transcodeStatus: 'complete' },
    });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}m3.mov`, video720pUrl: 'https://cdn/720.mp4', width: 1080, height: 1920, transcodeStatus: 'complete' },
    });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'image', originalUrl: `${URL_PREFIX}i1.jpg`, width: 1080, height: 1080 },
    });

    const report = await runBackfill({ dryRun: false, limit: 100, originalUrlFilter: TEST_FILTER });
    expect(report.totalCandidates).toBe(2);
    expect(report.triggered).toBe(2);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledWith(m1.id, expect.stringContaining('dev-test-m1.mov'));
    expect(transcodeService.triggerTranscode).toHaveBeenCalledWith(m2.id, expect.stringContaining('dev-test-m2.mov'));
  });

  it('dry-run reports count without firing', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-bf2', phone: '+912300000002', username: 'tbf2' });
    const c = await seedContent(u.id, { type: 'reel' });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}dry.mov`, width: 1080, height: 1920, transcodeStatus: 'pending' },
    });

    const report = await runBackfill({ dryRun: true, limit: 100, originalUrlFilter: TEST_FILTER });
    expect(report.totalCandidates).toBe(1);
    expect(report.triggered).toBe(0);
    expect(transcodeService.triggerTranscode).not.toHaveBeenCalled();
  });

  it('respects --limit', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-bf3', phone: '+912300000003', username: 'tbf3' });
    const c = await seedContent(u.id, { type: 'reel' });
    for (let i = 0; i < 5; i++) {
      await prisma.contentMedia.create({
        data: { contentId: c.id, type: 'video', originalUrl: `${URL_PREFIX}lim${i}.mov`, width: 1080, height: 1920, transcodeStatus: 'pending' },
      });
    }

    const report = await runBackfill({ dryRun: false, limit: 3, originalUrlFilter: TEST_FILTER });
    expect(report.totalCandidates).toBe(5);
    expect(report.triggered).toBe(3);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledTimes(3);
  });
});
