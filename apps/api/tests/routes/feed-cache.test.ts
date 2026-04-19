import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';

const fakeStore = new Map<string, string>();
const fakeRedis = {
  get: async (k: string) => fakeStore.get(k) ?? null,
  set: async (k: string, v: string) => {
    fakeStore.set(k, v);
    return 'OK';
  },
  del: async (k: string) => {
    fakeStore.delete(k);
    return 1;
  },
};

vi.mock('../../src/utils/redis.js', () => ({
  getRedis: () => fakeRedis,
}));

const { buildApp } = await import('../../src/app.js');
let app: FastifyInstance;

describe('GET /api/v1/feed — caching', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    app = buildApp();
  });

  beforeEach(async () => {
    fakeStore.clear();
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it('1st request populates the cache; 2nd request reads from cache (DB row deleted in between is invisible)', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-fc1', phone: '+912800000001', username: 'tfc1' });
    const c = await seedContent(u.id, { type: 'post', text: 'cached-content' });

    expect(fakeStore.size).toBe(0);

    const r1 = await app.inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fc1') },
    });
    expect(r1.statusCode).toBe(200);
    const body1 = r1.json();
    expect(body1.data.find((p: { id: string }) => p.id === c.id)).toBeDefined();
    expect(fakeStore.size).toBe(1);

    // Delete the content row directly. A non-cached call would now miss it.
    await prisma.content.delete({ where: { id: c.id } });

    const r2 = await app.inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fc1') },
    });
    expect(r2.statusCode).toBe(200);
    const body2 = r2.json();
    // 2nd response still includes the deleted content because it came from cache.
    expect(body2.data.find((p: { id: string }) => p.id === c.id)).toBeDefined();
  });
});
