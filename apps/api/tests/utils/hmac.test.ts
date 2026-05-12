import { describe, it, expect, beforeAll } from 'vitest';
import { signClaimCode, verifySignedCode } from '../../src/utils/hmac.js';

describe('hmac signClaimCode + verifySignedCode', () => {
  beforeAll(() => {
    process.env.HMAC_SECRET = 'test-secret-for-vitest-suite-long-enough';
  });

  it('round-trips a signed claim code', () => {
    const token = signClaimCode('ABC123');
    expect(token).toMatch(/^ABC123\.[A-Za-z0-9_-]{16}$/);
    const verified = verifySignedCode(token);
    expect(verified.claimCode).toBe('ABC123');
    expect(verified.signed).toBe(true);
  });

  it('accepts a raw (legacy) claim code as unsigned', () => {
    const verified = verifySignedCode('LEGACY-CODE');
    expect(verified.claimCode).toBe('LEGACY-CODE');
    expect(verified.signed).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const token = signClaimCode('XYZ789');
    // Mutate the signature portion only
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(() => verifySignedCode(tampered)).toThrow(/Invalid signature/);
  });

  it('rejects a tampered claim code while keeping the original signature', () => {
    const token = signClaimCode('OK1');
    const [, sig] = token.split('.');
    const forged = `OK2.${sig}`;
    expect(() => verifySignedCode(forged)).toThrow(/Invalid signature/);
  });

  it('rejects a malformed signed code', () => {
    expect(() => verifySignedCode('.')).toThrow(/Malformed/);
    expect(() => verifySignedCode('CODE.')).toThrow(/Malformed/);
    expect(() => verifySignedCode('.SIG')).toThrow(/Malformed/);
  });

  it('throws when HMAC_SECRET is missing', () => {
    const saved = process.env.HMAC_SECRET;
    delete process.env.HMAC_SECRET;
    try {
      expect(() => signClaimCode('X')).toThrow(/HMAC_SECRET/);
    } finally {
      process.env.HMAC_SECRET = saved;
    }
  });
});
