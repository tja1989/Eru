import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

// ── Mock Redis ────────────────────────────────────────────────────────────────
// Must be hoisted before any import that transitively loads whatsappOtpService
const mockStore = new Map<string, { value: string; expiresAt: number }>();
vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      async set(key: string, value: string, opts: { ex?: number }) {
        mockStore.set(key, { value, expiresAt: Date.now() + (opts.ex ?? 300) * 1000 });
      },
      async get(key: string) {
        const entry = mockStore.get(key);
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) { mockStore.delete(key); return null; }
        return entry.value;
      },
      async del(key: string) { mockStore.delete(key); },
    }),
  },
}));

// ── Mock firebase-admin ───────────────────────────────────────────────────────
vi.mock('firebase-admin', () => ({
  auth: () => ({
    getUserByPhoneNumber: vi.fn().mockRejectedValue(new Error('not found')),
    createUser: vi.fn().mockResolvedValue({ uid: 'fb-uid-test' }),
    createCustomToken: vi.fn().mockResolvedValue('mock-custom-token-123'),
  }),
}));

import { getTestApp, closeTestApp } from '../helpers/setup.js';

const TEST_PHONE = '+919876540001';

beforeEach(() => mockStore.clear());

afterAll(async () => {
  await closeTestApp();
});

describe('POST /api/v1/auth/whatsapp/send', () => {
  it('returns success:true for a valid phone', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/send',
      payload: { phone: TEST_PHONE },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it('returns 400 for an invalid phone (no +)', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/send',
      payload: { phone: '9876543210' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for a missing phone', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/send',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/v1/auth/whatsapp/verify', () => {
  it('returns 401 when code is wrong', async () => {
    // First seed a real OTP via /send
    await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/send',
      payload: { phone: TEST_PHONE },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/verify',
      payload: { phone: TEST_PHONE, code: '000000' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('returns customToken when code is correct', async () => {
    // Seed OTP
    await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/send',
      payload: { phone: TEST_PHONE },
    });

    // Pull the stored code directly from the mock store
    const storedCode = mockStore.get(`otp:${TEST_PHONE}`)!.value;

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/verify',
      payload: { phone: TEST_PHONE, code: storedCode },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().customToken).toBe('mock-custom-token-123');
  });

  it('returns 400 for an invalid code format', async () => {
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/auth/whatsapp/verify',
      payload: { phone: TEST_PHONE, code: 'abc' },
    });
    expect(res.statusCode).toBe(400);
  });
});
