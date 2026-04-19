import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import {
  fakeMediaConvertCompletionEvent,
  cleanupOrphanTestMedia,
  ensurePlaceholderContent,
  PLACEHOLDER_CONTENT_ID,
} from '../helpers/streaming.js';
import * as transcodeService from '../../src/services/transcodeService.js';

vi.mock('../../src/services/transcodeService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/transcodeService.js')>();
  return {
    ...actual,
    triggerTranscode: vi.fn().mockResolvedValue(undefined),
  };
});

const SECRET = 'test-pipeline-secret';

describe('End-to-end pipeline: upload → create → trigger → webhook → variants', () => {
  beforeAll(() => {
    process.env.MEDIACONVERT_WEBHOOK_SECRET = SECRET;
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';
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

  it('full pipeline: create content fires triggerTranscode; webhook populates variants', async () => {
    await seedUser({ firebaseUid: 'dev-test-e2e', phone: '+912400000001', username: 'te2e' });

    const media = await prisma.contentMedia.create({
      data: {
        contentId: PLACEHOLDER_CONTENT_ID,
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-e2e.mov',
        width: 1080, height: 1920,
        transcodeStatus: 'pending',
      },
    });

    const createRes = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-e2e') },
      payload: { type: 'reel', text: '', mediaIds: [media.id], hashtags: [] },
    });
    expect(createRes.statusCode).toBe(201);
    expect(transcodeService.triggerTranscode).toHaveBeenCalledTimes(1);

    const webhookRes = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/dev-test-e2e'),
    });
    expect(webhookRes.statusCode).toBe(200);

    const after = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(after?.transcodeStatus).toBe('complete');
    expect(after?.video360pUrl).toBe('https://cdn.eru.test/transcoded/dev-test-e2e_360p.mp4');
    expect(after?.video720pUrl).toBe('https://cdn.eru.test/transcoded/dev-test-e2e_720p.mp4');
    expect(after?.video1080pUrl).toBe('https://cdn.eru.test/transcoded/dev-test-e2e_1080p.mp4');
  });
});
