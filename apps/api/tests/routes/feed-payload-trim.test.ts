import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';

describe('GET /api/v1/feed — payload trim', () => {
  beforeAll(() => {
    process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? 'https://example.invalid';
    process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? 'tok';
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('feed item.user excludes bio / phone / firebaseUid / DOB and other server-only fields', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-trim1', phone: '+912900000001', username: 'ttrim1' });
    await prisma.user.update({
      where: { id: u.id },
      data: { bio: 'this should not appear in the feed payload', email: 'leak@example.com' },
    });
    await seedContent(u.id, { type: 'post', text: 'visible-post' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-trim1') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);

    const item = body.data[0];
    expect(item.user).toBeDefined();
    expect(item.user.id).toBeDefined();
    expect(item.user.username).toBeDefined();

    // Server-only fields must NOT appear in the wire format
    expect(item.user.bio).toBeUndefined();
    expect(item.user.email).toBeUndefined();
    expect(item.user.phone).toBeUndefined();
    expect(item.user.firebaseUid).toBeUndefined();
    expect(item.user.dob).toBeUndefined();
  });
});
