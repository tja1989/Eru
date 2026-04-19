import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { cleanupOrphanTestMedia, ensurePlaceholderContent, PLACEHOLDER_CONTENT_ID } from '../helpers/streaming.js';
import { prisma } from '../../src/utils/prisma.js';
import * as transcodeService from '../../src/services/transcodeService.js';

vi.mock('../../src/services/transcodeService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/transcodeService.js')>();
  return {
    ...actual,
    triggerTranscode: vi.fn().mockResolvedValue(undefined),
  };
});

describe('POST /api/v1/content/create — transcode triggering', () => {
  beforeAll(() => {
    process.env.MEDIACONVERT_ROLE_ARN = 'arn:aws:iam::000000000000:role/test-mc-role';
  });

  beforeEach(async () => {
    vi.mocked(transcodeService.triggerTranscode).mockReset();
    vi.mocked(transcodeService.triggerTranscode).mockResolvedValue(undefined);
    await cleanupTestData();
    await cleanupOrphanTestMedia();
    await ensurePlaceholderContent();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupOrphanTestMedia();
    await closeTestApp();
  });

  it('calls triggerTranscode for each video media attached', async () => {
    await seedUser({ firebaseUid: 'dev-test-tt1', phone: '+912200000001', username: 'ttt1' });

    const m1 = await prisma.contentMedia.create({
      data: {
        contentId: PLACEHOLDER_CONTENT_ID,
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-v1.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });
    const m2 = await prisma.contentMedia.create({
      data: {
        contentId: PLACEHOLDER_CONTENT_ID,
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-v2.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-tt1') },
      payload: { type: 'reel', text: 'Video post', mediaIds: [m1.id, m2.id], hashtags: [] },
    });

    expect(res.statusCode).toBe(201);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledTimes(2);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledWith(m1.id, expect.stringContaining('originals/dev-test-v1.mov'));
    expect(transcodeService.triggerTranscode).toHaveBeenCalledWith(m2.id, expect.stringContaining('originals/dev-test-v2.mov'));
  });

  it('does NOT call triggerTranscode for image media', async () => {
    await seedUser({ firebaseUid: 'dev-test-tt2', phone: '+912200000002', username: 'ttt2' });

    const img = await prisma.contentMedia.create({
      data: {
        contentId: PLACEHOLDER_CONTENT_ID,
        type: 'image',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-i1.jpg',
        width: 1080, height: 1080,
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-tt2') },
      payload: { type: 'post', text: 'Image post', mediaIds: [img.id], hashtags: [] },
    });

    expect(res.statusCode).toBe(201);
    expect(transcodeService.triggerTranscode).not.toHaveBeenCalled();
  });

  it('if triggerTranscode throws, content creation still succeeds (fire-and-forget)', async () => {
    vi.mocked(transcodeService.triggerTranscode).mockRejectedValue(new Error('MediaConvert boom'));
    await seedUser({ firebaseUid: 'dev-test-tt3', phone: '+912200000003', username: 'ttt3' });

    const vid = await prisma.contentMedia.create({
      data: {
        contentId: PLACEHOLDER_CONTENT_ID,
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-v3.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-tt3') },
      payload: { type: 'reel', text: 'Video post', mediaIds: [vid.id], hashtags: [] },
    });

    expect(res.statusCode).toBe(201);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledTimes(1);
  });
});
