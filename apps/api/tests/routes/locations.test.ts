import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';

describe('GET /api/v1/locations', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await seedUser({ firebaseUid: 'dev-test-loc1', phone: '+919900000001', username: 'tloc1' });
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('returns 200 with non-empty results for query "ernakulam"', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/locations?q=ernakulam',
      headers: { Authorization: devToken('dev-test-loc1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.results).toBeDefined();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].district).toBe('Ernakulam');
  });

  it('returns 400 when q param is missing', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/locations',
      headers: { Authorization: devToken('dev-test-loc1') },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Missing or invalid query');
  });

  it('returns 400 when q param is too short (< 2 chars)', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/locations?q=e',
      headers: { Authorization: devToken('dev-test-loc1') },
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when called without auth', async () => {
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/locations?q=ernakulam',
    });

    expect(res.statusCode).toBe(401);
  });
});
