import { describe, it, expect } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, cleanupTestData } from './db.js';

describe('cleanupTestData — Business Dashboard models', () => {
  it('removes CampaignEvent, Campaign, BusinessTransaction, BusinessPlan for dev-test owners with no FK violation', async () => {
    await cleanupTestData();

    const owner = await seedUser({
      firebaseUid: 'dev-test-bdcleanup',
      phone: '+15550000901',
      username: 'dev-test-bdcleanup',
    });
    const biz = await prisma.business.create({
      data: {
        name: 'BD Cleanup Biz',
        category: 'cafe',
        pincode: '560001',
        ownerId: owner.id,
      },
    });
    const plan = await prisma.businessPlan.create({
      data: { businessId: biz.id },
    });
    const tx = await prisma.businessTransaction.create({
      data: { businessId: biz.id, amount: 100, kind: 'topup' },
    });
    const camp = await prisma.campaign.create({
      data: { businessId: biz.id, type: 'promotion', title: 'Test Campaign' },
    });
    const ev = await prisma.campaignEvent.create({
      data: { campaignId: camp.id, kind: 'launch' },
    });

    await expect(cleanupTestData()).resolves.not.toThrow();

    expect(await prisma.campaignEvent.findUnique({ where: { id: ev.id } })).toBeNull();
    expect(await prisma.campaign.findUnique({ where: { id: camp.id } })).toBeNull();
    expect(await prisma.businessTransaction.findUnique({ where: { id: tx.id } })).toBeNull();
    expect(await prisma.businessPlan.findUnique({ where: { id: plan.id } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toBeNull();

    // Business row is left as orphan (ownerId set to null) which matches the
    // pre-existing cleanup contract — we don't delete businesses in cleanupTestData.
    // Clean it up here so the row doesn't accumulate across runs.
    await prisma.business.deleteMany({ where: { id: biz.id } });
  });
});
