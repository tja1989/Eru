import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { rewardsService } from '../../src/services/rewardsService.js';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from '../helpers/db.js';

async function seedOffer(overrides: Partial<{
  pointsCost: number;
  stock: number | null;
  perUserLimit: number;
  isActive: boolean;
  validUntil: Date;
}> = {}) {
  return prisma.offer.create({
    data: {
      type: 'giftcard',
      title: 'Test gift',
      pointsCost: overrides.pointsCost ?? 100,
      cashValue: 10 as any,
      stock: overrides.stock ?? null,
      perUserLimit: overrides.perUserLimit ?? 1,
      isActive: overrides.isActive ?? true,
      validFrom: new Date('2020-01-01'),
      validUntil: overrides.validUntil ?? new Date('2030-01-01'),
    },
  });
}

describe('rewardsService.claimOffer', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userReward.deleteMany({});
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.userReward.deleteMany({});
    await prisma.offer.deleteMany({});
  });

  it('deducts points from the user and creates a UserReward', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward1',
      phone: '+919300000001',
      username: 'treward1',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ pointsCost: 100 });

    const reward = await rewardsService.claimOffer(user.id, offer.id);

    expect(reward.claimCode).toMatch(/^ERU-/);
    expect(reward.pointsSpent).toBe(100);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.currentBalance).toBe(400);
  });

  it('rejects with INSUFFICIENT_POINTS when balance too low', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward2',
      phone: '+919300000002',
      username: 'treward2',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 50 } });
    const offer = await seedOffer({ pointsCost: 100 });

    await expect(rewardsService.claimOffer(user.id, offer.id)).rejects.toThrow(
      /insufficient points/i,
    );
  });

  it('rejects when offer is inactive', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward3',
      phone: '+919300000003',
      username: 'treward3',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ isActive: false });

    await expect(rewardsService.claimOffer(user.id, offer.id)).rejects.toThrow(/not available/i);
  });

  it('rejects when perUserLimit reached', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward4',
      phone: '+919300000004',
      username: 'treward4',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ pointsCost: 100, perUserLimit: 1 });

    await rewardsService.claimOffer(user.id, offer.id);
    await expect(rewardsService.claimOffer(user.id, offer.id)).rejects.toThrow(/limit/i);
  });

  it('decrements stock when stock is set', async () => {
    const user = await seedUser({
      firebaseUid: 'dev-test-reward5',
      phone: '+919300000005',
      username: 'treward5',
    });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 1000 } });
    const offer = await seedOffer({ pointsCost: 100, stock: 5, perUserLimit: 10 });

    await rewardsService.claimOffer(user.id, offer.id);
    const after = await prisma.offer.findUnique({ where: { id: offer.id } });
    expect(after?.stock).toBe(4);
  });

  it('generates unique claim codes', async () => {
    const user1 = await seedUser({
      firebaseUid: 'dev-test-reward6a',
      phone: '+919300000006',
      username: 'treward6a',
    });
    const user2 = await seedUser({
      firebaseUid: 'dev-test-reward6b',
      phone: '+919300000007',
      username: 'treward6b',
    });
    await prisma.user.update({ where: { id: user1.id }, data: { currentBalance: 500 } });
    await prisma.user.update({ where: { id: user2.id }, data: { currentBalance: 500 } });
    const offer = await seedOffer({ perUserLimit: 10 });

    const r1 = await rewardsService.claimOffer(user1.id, offer.id);
    const r2 = await rewardsService.claimOffer(user2.id, offer.id);
    expect(r1.claimCode).not.toBe(r2.claimCode);
  });
});
