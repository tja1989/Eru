import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('PUT /users/me/settings', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('updates avatarUrl and returns the updated value', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-set1', phone: '+913200000001', username: 'tset1' });
    const res = await getTestApp().inject({
      method: 'PUT',
      url: '/api/v1/users/me/settings',
      headers: { Authorization: devToken('dev-test-set1'), 'content-type': 'application/json' },
      payload: { avatarUrl: 'https://cdn.example.com/avatars/new.jpg' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Route returns { settings: user } — check either shape defensively
    expect(body.settings?.avatarUrl ?? body.user?.avatarUrl ?? body.avatarUrl).toBe(
      'https://cdn.example.com/avatars/new.jpg',
    );
    // Also verify it was persisted in the DB
    const fetched = await prisma.user.findUnique({ where: { id: u.id } });
    expect(fetched?.avatarUrl).toBe('https://cdn.example.com/avatars/new.jpg');
  });

  it('returns 409 when updating username to one already taken', async () => {
    await seedUser({ firebaseUid: 'dev-test-set2', phone: '+913200000002', username: 'tset2taken' });
    await seedUser({ firebaseUid: 'dev-test-set3', phone: '+913200000003', username: 'tset3' });
    const res = await getTestApp().inject({
      method: 'PUT',
      url: '/api/v1/users/me/settings',
      headers: { Authorization: devToken('dev-test-set3'), 'content-type': 'application/json' },
      payload: { username: 'tset2taken' },
    });
    expect(res.statusCode).toBe(409);
  });

  it('allows updating own username to the same value (idempotent)', async () => {
    await seedUser({ firebaseUid: 'dev-test-set4', phone: '+913200000004', username: 'tset4' });
    const res = await getTestApp().inject({
      method: 'PUT',
      url: '/api/v1/users/me/settings',
      headers: { Authorization: devToken('dev-test-set4'), 'content-type': 'application/json' },
      payload: { username: 'tset4' },
    });
    // Prisma UPDATE with the same value succeeds (no constraint violation on own row)
    expect(res.statusCode).toBe(200);
  });
});
