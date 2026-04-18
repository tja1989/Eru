import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { spinService } from '../../src/services/spinService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

describe('spinService.spin', () => {
  beforeEach(cleanupTestData);
  afterAll(cleanupTestData);

  it('awards between 1 and 50 points on first spin of day', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-sp1',
      phone: '+919900000030',
      username: 'tsp1',
    });
    const result = await spinService.spin(user.id);
    expect(result.pointsAwarded).toBeGreaterThanOrEqual(1);
    expect(result.pointsAwarded).toBeLessThanOrEqual(50);
  });

  it('persists the result and adds to user balance', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-sp2',
      phone: '+919900000031',
      username: 'tsp2',
    });
    const before = await prisma.user.findUnique({ where: { id: user.id } });
    const result = await spinService.spin(user.id);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after!.currentBalance - before!.currentBalance).toBe(result.pointsAwarded);
  });

  it('rejects a second spin on the same day', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-sp3',
      phone: '+919900000032',
      username: 'tsp3',
    });
    await spinService.spin(user.id);
    await expect(spinService.spin(user.id)).rejects.toThrow(/already spun/i);
  });

  it('canSpin() returns false after spinning', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-sp4',
      phone: '+919900000033',
      username: 'tsp4',
    });
    expect(await spinService.canSpin(user.id)).toBe(true);
    await spinService.spin(user.id);
    expect(await spinService.canSpin(user.id)).toBe(false);
  });
});
