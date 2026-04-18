import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Follow flow', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('POST /users/:id/follow creates a follow row', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flwa', phone: '+919200000001', username: 'tflwa' });
    const b = await seedUser({ firebaseUid: 'dev-test-flwb', phone: '+919200000002', username: 'tflwb' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flwa') },
    });

    expect(res.statusCode).toBe(201);
    const rel = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a.id, followingId: b.id } },
    });
    expect(rel).not.toBeNull();
  });

  it('double-follow returns 409 conflict', async () => {
    const app = getTestApp();
    await seedUser({ firebaseUid: 'dev-test-flw2a', phone: '+919200000003', username: 'tflw2a' });
    const b = await seedUser({ firebaseUid: 'dev-test-flw2b', phone: '+919200000004', username: 'tflw2b' });

    await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw2a') },
    });
    const res = await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw2a') },
    });

    expect(res.statusCode).toBe(409);
  });

  it('cannot follow yourself', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flwself', phone: '+919200000005', username: 'tflwself' });

    const res = await app.inject({
      method: 'POST', url: `/api/v1/users/${a.id}/follow`,
      headers: { Authorization: devToken('dev-test-flwself') },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /users/:id/unfollow removes the follow row', async () => {
    const app = getTestApp();
    const a = await seedUser({ firebaseUid: 'dev-test-flw3a', phone: '+919200000006', username: 'tflw3a' });
    const b = await seedUser({ firebaseUid: 'dev-test-flw3b', phone: '+919200000007', username: 'tflw3b' });

    await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw3a') },
    });

    const res = await app.inject({
      method: 'DELETE', url: `/api/v1/users/${b.id}/unfollow`,
      headers: { Authorization: devToken('dev-test-flw3a') },
    });

    expect(res.statusCode).toBe(200);
    const rel = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: a.id, followingId: b.id } },
    });
    expect(rel).toBeNull();
  });

  it('profile.isFollowing is true after follow', async () => {
    const app = getTestApp();
    await seedUser({ firebaseUid: 'dev-test-flw4a', phone: '+919200000008', username: 'tflw4a' });
    const b = await seedUser({ firebaseUid: 'dev-test-flw4b', phone: '+919200000009', username: 'tflw4b' });

    await app.inject({
      method: 'POST', url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-flw4a') },
    });

    const res = await app.inject({
      method: 'GET', url: `/api/v1/users/${b.id}/profile`,
      headers: { Authorization: devToken('dev-test-flw4a') },
    });

    expect(res.json().user.isFollowing).toBe(true);
  });
});
