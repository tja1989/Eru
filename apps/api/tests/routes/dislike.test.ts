import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('POST /api/v1/posts/:id/dislike', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => { await cleanupTestData(); await closeTestApp(); });

  it('creates a dislike interaction and increments dislikeCount', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-dis1a', phone: '+912000000001', username: 'tdis1a' });
    const content = await seedContent(u.id);
    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
      headers: { Authorization: devToken('dev-test-dis1a') },
    });
    expect(res.statusCode).toBe(201);
    const after = await prisma.content.findUnique({ where: { id: content.id } });
    expect(after?.dislikeCount).toBe(1);
  });

  it('DELETE /posts/:id/undislike decrements', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-dis2a', phone: '+912000000002', username: 'tdis2a' });
    const content = await seedContent(u.id);
    await getTestApp().inject({
      method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
      headers: { Authorization: devToken('dev-test-dis2a') },
    });
    const res = await getTestApp().inject({
      method: 'DELETE', url: `/api/v1/posts/${content.id}/undislike`,
      headers: { Authorization: devToken('dev-test-dis2a') },
    });
    expect(res.statusCode).toBe(200);
    const after = await prisma.content.findUnique({ where: { id: content.id } });
    expect(after?.dislikeCount).toBe(0);
  });

  it('POST dislike twice does not double-increment', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-dis3a', phone: '+912000000003', username: 'tdis3a' });
    const content = await seedContent(u.id);
    await getTestApp().inject({
      method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
      headers: { Authorization: devToken('dev-test-dis3a') },
    });
    const res2 = await getTestApp().inject({
      method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
      headers: { Authorization: devToken('dev-test-dis3a') },
    });
    expect([200, 201]).toContain(res2.statusCode);
    const after = await prisma.content.findUnique({ where: { id: content.id } });
    expect(after?.dislikeCount).toBe(1);
  });
});
