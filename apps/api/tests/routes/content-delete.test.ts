import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('DELETE /api/v1/content/:id', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('soft-deletes the author\'s own content', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del1', phone: '+912300000001', username: 'tdel1' });
    const c = await seedContent(u.id);

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del1') },
    });

    expect(res.statusCode).toBe(200);
    const after = await prisma.content.findUnique({ where: { id: c.id } });
    expect(after).not.toBeNull();
    expect(after?.deletedAt).not.toBeNull();
  });

  it('returns 403 when trying to delete someone else\'s content', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-del2a', phone: '+912300000002', username: 'tdel2a' });
    const other = await seedUser({ firebaseUid: 'dev-test-del2b', phone: '+912300000003', username: 'tdel2b' });
    const c = await seedContent(author.id);

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del2b') },
    });

    expect(res.statusCode).toBe(403);
    const after = await prisma.content.findUnique({ where: { id: c.id } });
    expect(after?.deletedAt).toBeNull();
  });

  it('returns 404 for content that does not exist', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del3', phone: '+912300000004', username: 'tdel3' });
    const res = await getTestApp().inject({
      method: 'DELETE',
      url: '/api/v1/content/00000000-0000-0000-0000-000000000000',
      headers: { Authorization: devToken('dev-test-del3') },
    });
    expect(res.statusCode).toBe(404);
  });

  it('preserves PointsLedger entries after soft-delete', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del4', phone: '+912300000005', username: 'tdel4' });
    const c = await seedContent(u.id);
    await prisma.pointsLedger.create({
      data: {
        userId: u.id,
        actionType: 'create_content',
        contentId: c.id,
        points: 30,
        multiplierApplied: 1.0 as any,
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del4') },
    });

    const ledgerCount = await prisma.pointsLedger.count({ where: { contentId: c.id } });
    expect(ledgerCount).toBe(1);
  });

  it('deleted content does not appear in the feed', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del5', phone: '+912300000006', username: 'tdel5' });
    const c = await seedContent(u.id);
    await getTestApp().inject({
      method: 'DELETE',
      url: `/api/v1/content/${c.id}`,
      headers: { Authorization: devToken('dev-test-del5') },
    });
    const feed = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed',
      headers: { Authorization: devToken('dev-test-del5') },
    });
    const ids = (feed.json().data ?? []).map((p: any) => p.id);
    expect(ids).not.toContain(c.id);
  });
});
