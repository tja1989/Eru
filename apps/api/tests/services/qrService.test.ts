import { describe, it, expect } from 'vitest';
import { qrService } from '../../src/services/qrService.js';

describe('qrService.generate', () => {
  it('returns an SVG string for the given code', async () => {
    const svg = await qrService.generate('ERU-TEST-1234');
    expect(svg).toMatch(/<svg /);
    expect(svg).toMatch(/<\/svg>/);
  });

  it('is deterministic for the same input', async () => {
    const a = await qrService.generate('ERU-TEST-1234');
    const b = await qrService.generate('ERU-TEST-1234');
    expect(a).toBe(b);
  });

  it('produces different output for different codes', async () => {
    const a = await qrService.generate('ERU-A');
    const b = await qrService.generate('ERU-B');
    expect(a).not.toBe(b);
  });

  it('rejects empty input with an error', async () => {
    await expect(qrService.generate('')).rejects.toThrow();
  });
});
