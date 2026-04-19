import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';
import {
  fakeMediaConvertCompletionEvent,
  fakeMediaConvertHlsCompletionEvent,
  fakeMediaConvertFailureEvent,
  seedPendingVideoMedia,
  cleanupOrphanTestMedia,
} from '../helpers/streaming.js';

const SECRET = 'test-secret-32-bytes-long-xxxxxx';

describe('POST /api/v1/webhooks/mediaconvert', () => {
  beforeAll(() => {
    process.env.MEDIACONVERT_WEBHOOK_SECRET = SECRET;
    process.env.CLOUDFRONT_DOMAIN = 'cdn.eru.test';
  });

  beforeEach(async () => {
    await cleanupTestData();
    await cleanupOrphanTestMedia();
  });

  afterAll(async () => {
    await cleanupTestData();
    await cleanupOrphanTestMedia();
    await closeTestApp();
  });

  it('rejects requests without the secret header (401)', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wh1', phone: '+912100000001', username: 'twh1' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await seedPendingVideoMedia({ contentId: content.id, suffix: 'wh1' });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/wh1'),
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects requests with a wrong secret (401)', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wh2', phone: '+912100000002', username: 'twh2' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await seedPendingVideoMedia({ contentId: content.id, suffix: 'wh2' });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': 'wrong-secret' },
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/wh2'),
    });

    expect(res.statusCode).toBe(401);
  });

  it('on COMPLETE event, populates video{360,720,1080}pUrl and sets status=complete', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wh3', phone: '+912100000003', username: 'twh3' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await seedPendingVideoMedia({ contentId: content.id, suffix: 'wh3' });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/wh3'),
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.transcodeStatus).toBe('complete');
    expect(updated?.video360pUrl).toBe('https://cdn.eru.test/transcoded/wh3_360p.mp4');
    expect(updated?.video720pUrl).toBe('https://cdn.eru.test/transcoded/wh3_720p.mp4');
    expect(updated?.video1080pUrl).toBe('https://cdn.eru.test/transcoded/wh3_1080p.mp4');
  });

  it('on ERROR event, sets status=failed', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wh4', phone: '+912100000004', username: 'twh4' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await seedPendingVideoMedia({ contentId: content.id, suffix: 'wh4' });

    const res = await getTestApp().inject({
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
    const u = await seedUser({ firebaseUid: 'dev-test-wh5', phone: '+912100000005', username: 'twh5' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await seedPendingVideoMedia({ contentId: content.id, suffix: 'wh5' });

    for (let i = 0; i < 3; i++) {
      const res = await getTestApp().inject({
        method: 'POST',
        url: '/api/v1/webhooks/mediaconvert',
        headers: { 'x-webhook-secret': SECRET },
        payload: fakeMediaConvertCompletionEvent(media.id, 'transcoded/wh5'),
      });
      expect(res.statusCode).toBe(200);
    }

    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.transcodeStatus).toBe('complete');
  });

  it('returns 404 for an unknown mediaId (event arrived after media deletion)', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertCompletionEvent('00000000-0000-0000-0000-aaaaaaaaaaaa', 'transcoded/deadbeef'),
    });

    expect(res.statusCode).toBe(404);
  });

  it('on HLS COMPLETE event, populates hlsManifestUrl + every variant rung', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-wh6', phone: '+912100000006', username: 'twh6' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await seedPendingVideoMedia({ contentId: content.id, suffix: 'wh6' });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/webhooks/mediaconvert',
      headers: { 'x-webhook-secret': SECRET },
      payload: fakeMediaConvertHlsCompletionEvent(media.id, 'transcoded/wh6'),
    });

    expect(res.statusCode).toBe(200);

    const updated = await prisma.contentMedia.findUnique({ where: { id: media.id } });
    expect(updated?.transcodeStatus).toBe('complete');
    expect(updated?.hlsManifestUrl).toBe('https://cdn.eru.test/transcoded/wh6/master.m3u8');
    expect(updated?.video240pUrl).toBe('https://cdn.eru.test/transcoded/wh6/240p.m3u8');
    expect(updated?.video360pUrl).toBe('https://cdn.eru.test/transcoded/wh6/360p.m3u8');
    expect(updated?.video540pUrl).toBe('https://cdn.eru.test/transcoded/wh6/540p.m3u8');
    expect(updated?.video720pUrl).toBe('https://cdn.eru.test/transcoded/wh6/720p.m3u8');
    expect(updated?.video1080pUrl).toBe('https://cdn.eru.test/transcoded/wh6/1080p.m3u8');
  });
});
