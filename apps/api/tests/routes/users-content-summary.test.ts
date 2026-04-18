import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/users/me/content-summary', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns counts grouped by moderation status and summed likes', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs1', phone: '+912200000001', username: 'tcs1' });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'published', publishedAt: new Date(), likeCount: 5 } });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'published', publishedAt: new Date(), likeCount: 7 } });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'pending', likeCount: 0 } });
    await prisma.content.create({ data: { userId: u.id, type: 'post', moderationStatus: 'declined', likeCount: 0 } });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/content-summary',
      headers: { Authorization: devToken('dev-test-cs1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary.published).toBe(2);
    expect(body.summary.pending).toBe(1);
    expect(body.summary.declined).toBe(1);
    expect(body.summary.totalLikes).toBe(12);
  });

  it('returns zeros for a user with no content', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs2', phone: '+912200000002', username: 'tcs2' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/content-summary',
      headers: { Authorization: devToken('dev-test-cs2') },
    });
    expect(res.json().summary).toEqual({ published: 0, pending: 0, declined: 0, totalLikes: 0 });
  });

  it("ignores other users' content", async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-cs3', phone: '+912200000003', username: 'tcs3' });
    const other = await seedUser({ firebaseUid: 'dev-test-cs4', phone: '+912200000004', username: 'tcs4' });
    await prisma.content.create({ data: { userId: other.id, type: 'post', moderationStatus: 'published', publishedAt: new Date(), likeCount: 99 } });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/content-summary',
      headers: { Authorization: devToken('dev-test-cs3') },
    });
    expect(res.json().summary.totalLikes).toBe(0);
  });
});
