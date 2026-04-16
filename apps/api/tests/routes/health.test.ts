import { describe, it, expect, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';

describe('GET /health', () => {
  afterAll(async () => {
    await closeTestApp();
  });

  it('returns 200 with status ok', async () => {
    const app = getTestApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
  });
});
