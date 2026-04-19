import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';
import { computeTrendingScore, getTopReels } from '../../src/services/trendingService.js';

describe('trendingService.computeTrendingScore', () => {
  it('returns 0 for a reel with no views', () => {
    expect(computeTrendingScore({ viewsLastHour: 0, creatorScore: 100, hoursSincePost: 1 })).toBe(0);
  });

  it('halves the score every 6 hours of post age', () => {
    const fresh = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 0 });
    const sixHours = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 6 });
    const twelveHours = computeTrendingScore({ viewsLastHour: 1000, creatorScore: 100, hoursSincePost: 12 });
    expect(sixHours / fresh).toBeCloseTo(0.5, 2);
    expect(twelveHours / fresh).toBeCloseTo(0.25, 2);
  });

  it('dampens creator score with square-root so mid-tier creators can trend', () => {
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

  it('orders recent-hot above stale-viral', async () => {
    const u1 = await seedUser({ firebaseUid: 'dev-test-tr1', phone: '+912700000001', username: 'ttr1' });
    const u2 = await seedUser({ firebaseUid: 'dev-test-tr2', phone: '+912700000002', username: 'ttr2' });

    const hot = await prisma.content.create({
      data: {
        userId: u1.id, type: 'reel',
        moderationStatus: 'published',
        viewCount: 5000,
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    });
    await prisma.contentMedia.create({
      data: {
        contentId: hot.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-tr-hot.mov',
        hlsManifestUrl: 'https://cdn/hot/master.m3u8',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    const old = await prisma.content.create({
      data: {
        userId: u2.id, type: 'reel',
        moderationStatus: 'published',
        viewCount: 100000,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    });
    await prisma.contentMedia.create({
      data: {
        contentId: old.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-tr-old.mov',
        hlsManifestUrl: 'https://cdn/old/master.m3u8',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    const top = await getTopReels(10);
    const hotIdx = top.findIndex(r => r.id === hot.id);
    const oldIdx = top.findIndex(r => r.id === old.id);
    expect(hotIdx).toBeGreaterThanOrEqual(0);
    expect(oldIdx).toBeGreaterThanOrEqual(0);
    expect(hotIdx).toBeLessThan(oldIdx);
  });

  it('skips reels without hlsManifestUrl (not pre-warmable)', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-tr3', phone: '+912700000003', username: 'ttr3' });
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
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-nohls.mov',
        hlsManifestUrl: null,
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    const top = await getTopReels(10);
    expect(top.find(r => r.id === noHls.id)).toBeUndefined();
  });

  it('filters out reels older than 48 hours', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-tr4', phone: '+912700000004', username: 'ttr4' });
    const stale = await prisma.content.create({
      data: {
        userId: u.id, type: 'reel',
        moderationStatus: 'published',
        viewCount: 1_000_000,
        createdAt: new Date(Date.now() - 60 * 60 * 60 * 1000),
      },
    });
    await prisma.contentMedia.create({
      data: {
        contentId: stale.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-stale.mov',
        hlsManifestUrl: 'https://cdn/stale/master.m3u8',
        width: 1080, height: 1920, transcodeStatus: 'complete',
      },
    });

    const top = await getTopReels(10);
    expect(top.find(r => r.id === stale.id)).toBeUndefined();
  });
});
