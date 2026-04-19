import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';

describe('Response compression', () => {
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

  it('honours Accept-Encoding: gzip on /api/v1/feed and returns Content-Encoding header', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cmp1', phone: '+913000000001', username: 'tcmp1' });
    // seed enough content to push the payload past the 1KB compression threshold
    for (let i = 0; i < 8; i++) {
      await seedContent(u.id, { type: 'post', text: `compress-me-${i} `.repeat(20) });
    }

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: {
        Authorization: devToken('dev-test-cmp1'),
        'accept-encoding': 'gzip',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('does not compress when Accept-Encoding is identity', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cmp2', phone: '+913000000002', username: 'tcmp2' });
    await seedContent(u.id, { type: 'post', text: 'short' });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: {
        Authorization: devToken('dev-test-cmp2'),
        'accept-encoding': 'identity',
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-encoding']).toBeUndefined();
  });
});
