import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedOwnerWithBalance(opts: { uid: string; phone: string; username: string; balance: number }) {
  const owner = await seedUser({ firebaseUid: opts.uid, phone: opts.phone, username: opts.username });
  const biz = await prisma.business.create({
    data: { name: `BD_TEST_${opts.username}`, category: 'cafe', pincode: '682016', ownerId: owner.id },
  });
  if (opts.balance > 0) {
    await prisma.businessTransaction.create({
      data: { businessId: biz.id, amount: opts.balance, kind: 'topup' },
    });
  }
  return { owner, biz };
}

describe('/api/v1/biz/campaigns', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 60_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 60_000);

  // ---------- GET /biz/campaigns ----------

  it('GET 401 without a token', async () => {
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/campaigns' });
    expect(res.statusCode).toBe(401);
  });

  it('GET 403 when caller does not own a business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bdc1', phone: '+912000100001', username: 'bdc1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/campaigns',
      headers: { Authorization: devToken('dev-test-bdc1') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET returns empty list when owner has no campaigns', async () => {
    await seedOwnerWithBalance({ uid: 'dev-test-bdc2', phone: '+912000100002', username: 'bdc2', balance: 0 });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/campaigns',
      headers: { Authorization: devToken('dev-test-bdc2') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ items: [] });
  });

  it('GET filters by status', async () => {
    const { biz } = await seedOwnerWithBalance({ uid: 'dev-test-bdc3', phone: '+912000100003', username: 'bdc3', balance: 0 });
    await prisma.campaign.createMany({
      data: [
        { businessId: biz.id, type: 'promotion', status: 'draft', title: 'Draft 1' },
        { businessId: biz.id, type: 'promotion', status: 'active', title: 'Active 1' },
        { businessId: biz.id, type: 'event', status: 'active', title: 'Active 2' },
      ],
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/campaigns?status=active',
      headers: { Authorization: devToken('dev-test-bdc3') },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items.every((c: { status: string }) => c.status === 'active')).toBe(true);
  });

  // ---------- POST /biz/campaigns ----------

  it('POST creates a draft campaign', async () => {
    await seedOwnerWithBalance({ uid: 'dev-test-bdc4', phone: '+912000100004', username: 'bdc4', balance: 0 });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/campaigns',
      headers: { Authorization: devToken('dev-test-bdc4') },
      payload: {
        type: 'promotion',
        title: 'Diwali Discount',
        body: '20% off everything',
        budget: 500,
        pincodes: ['682016', '682020'],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('draft');
    expect(body.title).toBe('Diwali Discount');
    expect(body.budget).toBe(500);
    expect(body.pincodes).toEqual(['682016', '682020']);
  });

  it('POST 400 on invalid payload (missing title)', async () => {
    await seedOwnerWithBalance({ uid: 'dev-test-bdc5', phone: '+912000100005', username: 'bdc5', balance: 0 });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/biz/campaigns',
      headers: { Authorization: devToken('dev-test-bdc5') },
      payload: { type: 'promotion' },
    });
    expect(res.statusCode).toBe(400);
  });

  // ---------- PATCH /biz/campaigns/:id ----------

  it('PATCH 200 on a draft campaign', async () => {
    const { biz } = await seedOwnerWithBalance({ uid: 'dev-test-bdc6', phone: '+912000100006', username: 'bdc6', balance: 0 });
    const c = await prisma.campaign.create({
      data: { businessId: biz.id, type: 'promotion', status: 'draft', title: 'Old Title' },
    });
    const res = await getTestApp().inject({
      method: 'PATCH',
      url: `/api/v1/biz/campaigns/${c.id}`,
      headers: { Authorization: devToken('dev-test-bdc6') },
      payload: { title: 'New Title', budget: 1000 },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.title).toBe('New Title');
    expect(body.budget).toBe(1000);
  });

  it('PATCH 409 on a non-draft (active) campaign', async () => {
    const { biz } = await seedOwnerWithBalance({ uid: 'dev-test-bdc7', phone: '+912000100007', username: 'bdc7', balance: 0 });
    const c = await prisma.campaign.create({
      data: { businessId: biz.id, type: 'promotion', status: 'active', title: 'Locked' },
    });
    const res = await getTestApp().inject({
      method: 'PATCH',
      url: `/api/v1/biz/campaigns/${c.id}`,
      headers: { Authorization: devToken('dev-test-bdc7') },
      payload: { title: 'Cannot Change' },
    });
    expect(res.statusCode).toBe(409);
  });

  // ---------- POST /biz/campaigns/:id/launch ----------

  it('POST launch flips status, debits balance, writes a CampaignEvent', async () => {
    const { biz } = await seedOwnerWithBalance({ uid: 'dev-test-bdc8', phone: '+912000100008', username: 'bdc8', balance: 1000 });
    const c = await prisma.campaign.create({
      data: { businessId: biz.id, type: 'promotion', status: 'draft', title: 'Diwali', budget: 500 },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/campaigns/${c.id}/launch`,
      headers: { Authorization: devToken('dev-test-bdc8') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('active');

    const after = await prisma.campaign.findUnique({ where: { id: c.id } });
    expect(after?.status).toBe('active');

    const txs = await prisma.businessTransaction.findMany({ where: { businessId: biz.id, kind: 'campaign_debit' } });
    expect(txs).toHaveLength(1);
    expect(Number(txs[0].amount)).toBe(-500);
    expect(txs[0].refId).toBe(c.id);

    const events = await prisma.campaignEvent.findMany({ where: { campaignId: c.id, kind: 'launch' } });
    expect(events).toHaveLength(1);
  });

  it('POST launch 402 when balance is insufficient', async () => {
    const { biz } = await seedOwnerWithBalance({ uid: 'dev-test-bdc9', phone: '+912000100009', username: 'bdc9', balance: 100 });
    const c = await prisma.campaign.create({
      data: { businessId: biz.id, type: 'promotion', status: 'draft', title: 'Too Expensive', budget: 500 },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/campaigns/${c.id}/launch`,
      headers: { Authorization: devToken('dev-test-bdc9') },
    });
    expect(res.statusCode).toBe(402);

    const still = await prisma.campaign.findUnique({ where: { id: c.id } });
    expect(still?.status).toBe('draft');
    const txs = await prisma.businessTransaction.findMany({ where: { businessId: biz.id, kind: 'campaign_debit' } });
    expect(txs).toHaveLength(0);
  });
});
