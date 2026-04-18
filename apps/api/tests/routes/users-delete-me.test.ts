import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('DELETE /users/me', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns 204 on success and sets deletedAt on the user', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del1', phone: '+919100000001', username: 'tdel1' });

    const res = await getTestApp().inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: { Authorization: devToken('dev-test-del1') },
    });

    expect(res.statusCode).toBe(204);

    // deletedAt should be set in the DB
    const fetched = await prisma.user.findUnique({ where: { id: u.id } });
    expect(fetched?.deletedAt).not.toBeNull();
  });

  it('anonymizes user fields on delete', async () => {
    await seedUser({ firebaseUid: 'dev-test-del2', phone: '+919100000002', username: 'tdel2', name: 'Real Name' });

    await getTestApp().inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: { Authorization: devToken('dev-test-del2') },
    });

    // Find by username prefix since the original username was changed
    const fetched = await prisma.user.findFirst({
      where: { username: { startsWith: 'deleted_' } },
    });
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Deleted User');
    expect(fetched?.bio).toBeNull();
    expect(fetched?.avatarUrl).toBeNull();
    expect(fetched?.email).toBeNull();
    // phone and firebaseUid should be sentinel values
    expect(fetched?.phone).toMatch(/^deleted_/);
    expect(fetched?.firebaseUid).toMatch(/^deleted_/);
  });

  it('GET /users/me/settings returns 401 after delete (deleted user cannot re-auth)', async () => {
    await seedUser({ firebaseUid: 'dev-test-del3', phone: '+919100000003', username: 'tdel3' });

    // Delete the account
    await getTestApp().inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: { Authorization: devToken('dev-test-del3') },
    });

    // After deletion, the firebase UID has been changed to a sentinel — so the
    // original dev token 'dev-test-del3' no longer resolves to any user → 401
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/users/me/settings',
      headers: { Authorization: devToken('dev-test-del3') },
    });

    expect(res.statusCode).toBe(401);
  });

  it('content owned by the user still exists after soft-delete', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-del4', phone: '+919100000004', username: 'tdel4' });
    const post = await seedContent(u.id, { text: 'Keep this post', moderationStatus: 'published' });

    await getTestApp().inject({
      method: 'DELETE',
      url: '/api/v1/users/me',
      headers: { Authorization: devToken('dev-test-del4') },
    });

    // Post should still be in the DB, owned by the same user ID
    const fetched = await prisma.content.findUnique({ where: { id: post.id } });
    expect(fetched).not.toBeNull();
    expect(fetched?.userId).toBe(u.id);
  });
});
