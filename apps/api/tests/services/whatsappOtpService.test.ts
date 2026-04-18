import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis — must be declared before importing the service so vitest hoists it
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
        if (entry.expiresAt < Date.now()) {
          mockStore.delete(key);
          return null;
        }
        return entry.value;
      },
      async del(key: string) {
        mockStore.delete(key);
      },
    }),
  },
}));

import { whatsappOtpService } from '../../src/services/whatsappOtpService.js';

beforeEach(() => mockStore.clear());

describe('whatsappOtpService', () => {
  it('sendOtp generates a 6-digit code and stores it keyed by phone', async () => {
    await whatsappOtpService.sendOtp('+919876543210');
    const stored = mockStore.get('otp:+919876543210');
    expect(stored?.value).toMatch(/^\d{6}$/);
  });

  it('verifyOtp returns true if code matches', async () => {
    await whatsappOtpService.sendOtp('+919876543211');
    const stored = mockStore.get('otp:+919876543211')!.value;
    const ok = await whatsappOtpService.verifyOtp('+919876543211', stored);
    expect(ok).toBe(true);
  });

  it('verifyOtp returns false if code does not match', async () => {
    await whatsappOtpService.sendOtp('+919876543212');
    const ok = await whatsappOtpService.verifyOtp('+919876543212', '000000');
    expect(ok).toBe(false);
  });

  it('verifyOtp deletes the code after successful verification', async () => {
    await whatsappOtpService.sendOtp('+919876543213');
    const stored = mockStore.get('otp:+919876543213')!.value;
    await whatsappOtpService.verifyOtp('+919876543213', stored);
    expect(mockStore.has('otp:+919876543213')).toBe(false);
  });

  it('verifyOtp returns false for an unknown phone', async () => {
    const ok = await whatsappOtpService.verifyOtp('+910000000000', '123456');
    expect(ok).toBe(false);
  });
});
