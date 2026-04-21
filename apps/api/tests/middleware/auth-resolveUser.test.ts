import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { resolveUserFromToken } from '../../src/middleware/auth.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

describe('resolveUserFromToken (reusable for WS gateway + REST middleware)', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });
  afterAll(cleanupTestData);

  it('resolves a dev-test token to the corresponding user when ALLOW_DEV_TOKENS=true', async () => {
    const original = process.env.ALLOW_DEV_TOKENS;
    process.env.ALLOW_DEV_TOKENS = 'true';

    const seeded = await seedUser({ firebaseUid: 'dev-test-rt1', phone: '+912000040001', username: 'rt1' });
    const user = await resolveUserFromToken('dev-test-rt1');
    expect(user?.id).toBe(seeded.id);
    expect(user?.role).toBeDefined();

    process.env.ALLOW_DEV_TOKENS = original;
  });

  it('returns null when token is unknown', async () => {
    const original = process.env.ALLOW_DEV_TOKENS;
    process.env.ALLOW_DEV_TOKENS = 'true';
    const user = await resolveUserFromToken('dev-test-nobody');
    expect(user).toBeNull();
    process.env.ALLOW_DEV_TOKENS = original;
  });

  it('returns null when token is empty', async () => {
    const user = await resolveUserFromToken('');
    expect(user).toBeNull();
  });

  it('returns null when user has been deleted', async () => {
    const original = process.env.ALLOW_DEV_TOKENS;
    process.env.ALLOW_DEV_TOKENS = 'true';
    const seeded = await seedUser({ firebaseUid: 'dev-test-rtdeleted', phone: '+912000040002', username: 'rtdel' });
    const { prisma } = await import('../../src/utils/prisma.js');
    await prisma.user.update({ where: { id: seeded.id }, data: { deletedAt: new Date() } });
    const user = await resolveUserFromToken('dev-test-rtdeleted');
    expect(user).toBeNull();
    process.env.ALLOW_DEV_TOKENS = original;
  });
});
