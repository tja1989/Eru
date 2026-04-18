import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';

describe('ContentReport schema', () => {
  it('can count contentReport rows', async () => {
    const count = await prisma.contentReport.count();
    expect(typeof count).toBe('number');
  });
});
