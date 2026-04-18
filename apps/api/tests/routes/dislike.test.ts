import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Dislike endpoints', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => { await cleanupTestData(); await closeTestApp(); });

  describe('POST /api/v1/posts/:id/dislike', () => {
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

    it('POST dislike twice returns 409 conflict and does not double-increment', async () => {
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
      expect(res2.statusCode).toBe(409);
      const after = await prisma.content.findUnique({ where: { id: content.id } });
      expect(after?.dislikeCount).toBe(1);
    });
  });

  describe('DELETE /api/v1/posts/:id/undislike', () => {
    it('decrements dislikeCount after removing a dislike', async () => {
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
  });

  describe('GET /api/v1/posts/:id isDisliked field', () => {
    it('returns isDisliked: false before disliking and isDisliked: true after', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-dis4a', phone: '+912000000004', username: 'tdis4a' });
      const content = await seedContent(u.id);

      // Before disliking — should be false
      const resBefore = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${content.id}`,
        headers: { Authorization: devToken('dev-test-dis4a') },
      });
      expect(resBefore.statusCode).toBe(200);
      expect(resBefore.json().content.isDisliked).toBe(false);

      // Dislike the post
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/posts/${content.id}/dislike`,
        headers: { Authorization: devToken('dev-test-dis4a') },
      });

      // After disliking — should be true
      const resAfter = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${content.id}`,
        headers: { Authorization: devToken('dev-test-dis4a') },
      });
      expect(resAfter.statusCode).toBe(200);
      expect(resAfter.json().content.isDisliked).toBe(true);
    });
  });
});
