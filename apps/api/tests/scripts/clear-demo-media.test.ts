import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';
import { cleanupOrphanTestMedia } from '../helpers/streaming.js';
import { clearDemoMedia } from '../../src/scripts/clear-demo-media.js';

describe('clear-demo-media script', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await cleanupOrphanTestMedia();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupOrphanTestMedia();
  });

  it('dry-run reports counts without deleting anything', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cdm1', phone: '+912700000001', username: 'tcdm1' });
    const c = await seedContent(u.id, { type: 'reel' });
    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-cdm1.mov',
        width: 1080, height: 1920, transcodeStatus: 'complete' },
    });

    const report = await clearDemoMedia({ dryRun: true });
    expect(report.contentToDelete).toBeGreaterThanOrEqual(1);
    expect(report.mediaToDelete).toBeGreaterThanOrEqual(1);

    // Nothing actually removed
    const stillThere = await prisma.content.findUnique({ where: { id: c.id } });
    expect(stillThere).not.toBeNull();
    const mediaStillThere = await prisma.contentMedia.count({ where: { contentId: c.id } });
    expect(mediaStillThere).toBe(1);
  });

  it('apply mode deletes all content + dependent rows but preserves users', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cdm2', phone: '+912700000002', username: 'tcdm2' });
    const c = await seedContent(u.id, { type: 'reel' });

    await prisma.contentMedia.create({
      data: { contentId: c.id, type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-cdm2.mov',
        width: 1080, height: 1920, transcodeStatus: 'complete' },
    });
    await prisma.interaction.create({
      data: { userId: u.id, contentId: c.id, type: 'like' },
    });
    await prisma.comment.create({
      data: { userId: u.id, contentId: c.id, text: 'nice' },
    });
    await prisma.moderationQueue.create({
      data: { contentId: c.id, autoApproved: true },
    });

    const report = await clearDemoMedia({ dryRun: false });
    expect(report.contentDeleted).toBeGreaterThanOrEqual(1);

    expect(await prisma.content.findUnique({ where: { id: c.id } })).toBeNull();
    expect(await prisma.contentMedia.count({ where: { contentId: c.id } })).toBe(0);
    expect(await prisma.interaction.count({ where: { contentId: c.id } })).toBe(0);
    expect(await prisma.comment.count({ where: { contentId: c.id } })).toBe(0);
    expect(await prisma.moderationQueue.count({ where: { contentId: c.id } })).toBe(0);

    // Users survive
    const user = await prisma.user.findUnique({ where: { id: u.id } });
    expect(user).not.toBeNull();
  });

  it('handles thread parent/child without FK violation', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cdm3', phone: '+912700000003', username: 'tcdm3' });
    const parent = await seedContent(u.id, { type: 'thread', text: 'parent' });
    const child = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'thread',
        text: 'child',
        moderationStatus: 'published',
        publishedAt: new Date(),
        threadParentId: parent.id,
        threadPosition: 1,
      },
    });

    const report = await clearDemoMedia({ dryRun: false });
    expect(report.contentDeleted).toBeGreaterThanOrEqual(2);

    expect(await prisma.content.findUnique({ where: { id: parent.id } })).toBeNull();
    expect(await prisma.content.findUnique({ where: { id: child.id } })).toBeNull();
  });
});
