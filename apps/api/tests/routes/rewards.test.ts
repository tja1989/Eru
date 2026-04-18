import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/rewards', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userReward.deleteMany({});
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
  });

  it('returns the users rewards', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-mr1', phone: '+919600000001', username: 'tmr1' });
    await prisma.user.update({ where: { id: user.id }, data: { currentBalance: 1000 } });
    const offer = await prisma.offer.create({
      data: {
        type: 'giftcard',
        title: 'Amazon',
        pointsCost: 100,
        cashValue: 10 as any,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
      },
    });
    await prisma.userReward.create({
      data: {
        userId: user.id,
        offerId: offer.id,
        claimCode: 'ERU-TEST',
        pointsSpent: 100,
        expiresAt: new Date('2030-01-01'),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/rewards',
      headers: { Authorization: devToken('dev-test-mr1') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().rewards).toHaveLength(1);
    expect(res.json().rewards[0].claimCode).toBe('ERU-TEST');
  });

  it('filters by status', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-mr2', phone: '+919600000002', username: 'tmr2' });
    const offer = await prisma.offer.create({
      data: {
        type: 'giftcard',
        title: 'X',
        pointsCost: 10,
        cashValue: 1 as any,
        validFrom: new Date('2020-01-01'),
        validUntil: new Date('2030-01-01'),
      },
    });
    await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'A', pointsSpent: 10, status: 'active', expiresAt: new Date('2030-01-01') },
    });
    await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'B', pointsSpent: 10, status: 'used', usedAt: new Date(), expiresAt: new Date('2030-01-01') },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/rewards?status=active',
      headers: { Authorization: devToken('dev-test-mr2') },
    });
    expect(res.json().rewards).toHaveLength(1);
    expect(res.json().rewards[0].claimCode).toBe('A');
  });
});

describe('PUT /api/v1/rewards/:id/use', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.userReward.deleteMany({});
    await prisma.offer.deleteMany({});
  });
  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({});
    await closeTestApp();
  });

  it('marks an active reward as used', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-use', phone: '+919600000009', username: 'tuse' });
    const offer = await prisma.offer.create({
      data: { type: 'local', title: 'Y', pointsCost: 10, cashValue: 1 as any, validFrom: new Date('2020-01-01'), validUntil: new Date('2030-01-01') },
    });
    const reward = await prisma.userReward.create({
      data: { userId: user.id, offerId: offer.id, claimCode: 'Z', pointsSpent: 10, status: 'active', expiresAt: new Date('2030-01-01') },
    });

    const res = await getTestApp().inject({
      method: 'PUT',
      url: `/api/v1/rewards/${reward.id}/use`,
      headers: { Authorization: devToken('dev-test-use') },
    });
    expect(res.statusCode).toBe(200);
    const after = await prisma.userReward.findUnique({ where: { id: reward.id } });
    expect(after?.status).toBe('used');
  });
});
