import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedOwnerWithOffer(opts: { uid: string; phone: string; username: string; offerTitle: string }) {
  const owner = await seedUser({ firebaseUid: opts.uid, phone: opts.phone, username: opts.username });
  const biz = await prisma.business.create({
    data: { name: `BD_TEST_QR_${opts.username}`, category: 'cafe', pincode: '682016', ownerId: owner.id },
  });
  const offer = await prisma.offer.create({
    data: {
      type: 'local', businessId: biz.id, title: opts.offerTitle,
      pointsCost: 100, cashValue: 50,
      validFrom: new Date(), validUntil: new Date(Date.now() + 86400_000),
    },
  });
  return { owner, biz, offer };
}

describe('POST /api/v1/biz/qrscan', () => {
  // Single up-front cleanup; tests use unique dev-test-bdq*/CODE-* identifiers
  // so they don't collide with each other. Avoids the ~80s cleanupTestData
  // round-trip per test against the slow Supabase pooler today.
  beforeAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({ where: { title: { startsWith: 'BD_TEST_QR_' } } });
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_QR_' } } });
  }, 180_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.offer.deleteMany({ where: { title: { startsWith: 'BD_TEST_QR_' } } });
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_QR_' } } });
    await closeTestApp();
  }, 180_000);

  it('401 without a token', async () => {
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/biz/qrscan', payload: { claimCode: 'x' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('404 on unknown claimCode', async () => {
    await seedOwnerWithOffer({ uid: 'dev-test-bdq1', phone: '+912000150001', username: 'bdq1', offerTitle: 'BD_TEST_QR_o1' });
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/biz/qrscan',
      headers: { Authorization: devToken('dev-test-bdq1') },
      payload: { claimCode: 'CODE-NOT-EXIST' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('404 when claimCode belongs to another business\'s offer', async () => {
    await seedOwnerWithOffer({ uid: 'dev-test-bdq2', phone: '+912000150002', username: 'bdq2', offerTitle: 'BD_TEST_QR_caller' });
    const { offer: otherOffer } = await seedOwnerWithOffer({
      uid: 'dev-test-bdq2x', phone: '+912000150022', username: 'bdq2x', offerTitle: 'BD_TEST_QR_other',
    });
    const claimer = await seedUser({ firebaseUid: 'dev-test-bdq2c', phone: '+912000150032', username: 'bdq2c' });
    const reward = await prisma.userReward.create({
      data: {
        userId: claimer.id, offerId: otherOffer.id, claimCode: 'CODE-OTHER-X1',
        pointsSpent: 100, expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/biz/qrscan',
      headers: { Authorization: devToken('dev-test-bdq2') },
      payload: { claimCode: reward.claimCode },
    });
    expect(res.statusCode).toBe(404);

    const still = await prisma.userReward.findUnique({ where: { id: reward.id } });
    expect(still?.status).toBe('active');
  });

  it('200 marks the reward used (no campaign → no CampaignEvent)', async () => {
    const { offer } = await seedOwnerWithOffer({
      uid: 'dev-test-bdq3', phone: '+912000150003', username: 'bdq3', offerTitle: 'BD_TEST_QR_plain',
    });
    const claimer = await seedUser({ firebaseUid: 'dev-test-bdq3c', phone: '+912000150013', username: 'bdq3c' });
    const reward = await prisma.userReward.create({
      data: {
        userId: claimer.id, offerId: offer.id, claimCode: 'CODE-PLAIN-1',
        pointsSpent: 100, expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/biz/qrscan',
      headers: { Authorization: devToken('dev-test-bdq3') },
      payload: { claimCode: reward.claimCode },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.reward.id).toBe(reward.id);
    expect(body.reward.status).toBe('used');
    expect(body.campaignEventId).toBeNull();

    const after = await prisma.userReward.findUnique({ where: { id: reward.id } });
    expect(after?.status).toBe('used');
    expect(after?.usedAt).not.toBeNull();
  });

  it('200 marks reward used AND emits a CampaignEvent { kind: visit } when offer belongs to a campaign', async () => {
    const { biz, offer } = await seedOwnerWithOffer({
      uid: 'dev-test-bdq4', phone: '+912000150004', username: 'bdq4', offerTitle: 'BD_TEST_QR_camp',
    });
    const campaign = await prisma.campaign.create({
      data: { businessId: biz.id, type: 'promotion', status: 'active', title: 'BD_QR_Campaign', offerId: offer.id },
    });
    const claimer = await seedUser({ firebaseUid: 'dev-test-bdq4c', phone: '+912000150014', username: 'bdq4c' });
    const reward = await prisma.userReward.create({
      data: {
        userId: claimer.id, offerId: offer.id, claimCode: 'CODE-CAMP-1',
        pointsSpent: 100, expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/biz/qrscan',
      headers: { Authorization: devToken('dev-test-bdq4') },
      payload: { claimCode: reward.claimCode },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.campaignEventId).toBeTruthy();

    const event = await prisma.campaignEvent.findUnique({ where: { id: body.campaignEventId } });
    expect(event?.campaignId).toBe(campaign.id);
    expect(event?.kind).toBe('visit');
    expect(event?.userId).toBe(claimer.id);
  });

  it('409 on an already-used claimCode', async () => {
    const { offer } = await seedOwnerWithOffer({
      uid: 'dev-test-bdq5', phone: '+912000150005', username: 'bdq5', offerTitle: 'BD_TEST_QR_dup',
    });
    const claimer = await seedUser({ firebaseUid: 'dev-test-bdq5c', phone: '+912000150015', username: 'bdq5c' });
    await prisma.userReward.create({
      data: {
        userId: claimer.id, offerId: offer.id, claimCode: 'CODE-DUP-1',
        pointsSpent: 100, expiresAt: new Date(Date.now() + 86400_000),
        status: 'used', usedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/biz/qrscan',
      headers: { Authorization: devToken('dev-test-bdq5') },
      payload: { claimCode: 'CODE-DUP-1' },
    });
    expect(res.statusCode).toBe(409);
  });
});
