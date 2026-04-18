import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Save endpoints', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => { await cleanupTestData(); await closeTestApp(); });

  describe('POST /api/v1/posts/:id/save', () => {
    it('creates a save interaction', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-sav1a', phone: '+912200000001', username: 'tsav1a' });
      const content = await seedContent(u.id);
      const res = await getTestApp().inject({
        method: 'POST', url: `/api/v1/posts/${content.id}/save`,
        headers: { Authorization: devToken('dev-test-sav1a') },
      });
      expect(res.statusCode).toBe(201);
      const interaction = await prisma.interaction.findFirst({
        where: { userId: u.id, contentId: content.id, type: 'save' },
      });
      expect(interaction).not.toBeNull();
    });

    it('returns 409 on duplicate save', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-sav2a', phone: '+912200000002', username: 'tsav2a' });
      const content = await seedContent(u.id);
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/posts/${content.id}/save`,
        headers: { Authorization: devToken('dev-test-sav2a') },
      });
      const res2 = await getTestApp().inject({
        method: 'POST', url: `/api/v1/posts/${content.id}/save`,
        headers: { Authorization: devToken('dev-test-sav2a') },
      });
      expect(res2.statusCode).toBe(409);
    });
  });

  describe('DELETE /api/v1/posts/:id/unsave', () => {
    it('removes the save interaction', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-sav3a', phone: '+912200000003', username: 'tsav3a' });
      const content = await seedContent(u.id);
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/posts/${content.id}/save`,
        headers: { Authorization: devToken('dev-test-sav3a') },
      });
      const res = await getTestApp().inject({
        method: 'DELETE', url: `/api/v1/posts/${content.id}/unsave`,
        headers: { Authorization: devToken('dev-test-sav3a') },
      });
      expect(res.statusCode).toBe(200);
      const interaction = await prisma.interaction.findFirst({
        where: { userId: u.id, contentId: content.id, type: 'save' },
      });
      expect(interaction).toBeNull();
    });

    it('returns 404 if no save to remove', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-sav4a', phone: '+912200000004', username: 'tsav4a' });
      const content = await seedContent(u.id);
      const res = await getTestApp().inject({
        method: 'DELETE', url: `/api/v1/posts/${content.id}/unsave`,
        headers: { Authorization: devToken('dev-test-sav4a') },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/content/:id isSaved field', () => {
    it('returns isSaved: true after saving, false before', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-sav5a', phone: '+912200000005', username: 'tsav5a' });
      const content = await seedContent(u.id);
      const before = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${content.id}`,
        headers: { Authorization: devToken('dev-test-sav5a') },
      });
      expect(before.json().content.isSaved).toBe(false);

      await getTestApp().inject({
        method: 'POST', url: `/api/v1/posts/${content.id}/save`,
        headers: { Authorization: devToken('dev-test-sav5a') },
      });
      const after = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${content.id}`,
        headers: { Authorization: devToken('dev-test-sav5a') },
      });
      expect(after.json().content.isSaved).toBe(true);
    });
  });
});
