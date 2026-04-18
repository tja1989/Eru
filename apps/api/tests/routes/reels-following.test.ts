import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';

describe('GET /reels isFollowing flag', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns user.isFollowing=true for creators the viewer follows', async () => {
    const app = getTestApp();
    // Viewer "A" will follow creator "B", and view A/C reels
    await seedUser({ firebaseUid: 'dev-test-rfa', phone: '+919300000001', username: 'trfa' });
    const b = await seedUser({ firebaseUid: 'dev-test-rfb', phone: '+919300000002', username: 'trfb' });
    const c = await seedUser({ firebaseUid: 'dev-test-rfc', phone: '+919300000003', username: 'trfc' });

    // Each creator posts one reel
    await seedContent(b.id, { type: 'reel', text: 'reel-b' });
    await seedContent(c.id, { type: 'reel', text: 'reel-c' });

    // A follows B (not C)
    await app.inject({
      method: 'POST',
      url: `/api/v1/users/${b.id}/follow`,
      headers: { Authorization: devToken('dev-test-rfa') },
    });

    // A fetches reels
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/reels?tab=foryou&page=1&limit=20',
      headers: { Authorization: devToken('dev-test-rfa') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const reels: Array<{ user: { id: string; isFollowing: boolean } }> = body.data;

    const reelFromB = reels.find((r) => r.user.id === b.id);
    const reelFromC = reels.find((r) => r.user.id === c.id);

    expect(reelFromB).toBeDefined();
    expect(reelFromC).toBeDefined();
    expect(reelFromB!.user.isFollowing).toBe(true);
    expect(reelFromC!.user.isFollowing).toBe(false);
  });
});
