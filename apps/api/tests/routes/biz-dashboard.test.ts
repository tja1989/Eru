import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('GET /api/v1/biz/dashboard', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 30_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 30_000);

  it('returns 401 without a bearer token', async () => {
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/dashboard' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when the caller does not own a business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bzd1', phone: '+912000090001', username: 'bzd1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/dashboard',
      headers: { Authorization: devToken('dev-test-bzd1') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns zeroed KPIs and a length-7 dailyImpressions array when the owner has no campaigns', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzd2', phone: '+912000090002', username: 'bzd2' });
    await prisma.business.create({
      data: { name: 'BD_TEST_Empty Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/dashboard?period=week',
      headers: { Authorization: devToken('dev-test-bzd2') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.period).toBe('week');
    expect(body.kpis).toEqual({
      impressions: 0,
      clicks: 0,
      ctr: 0,
      claims: 0,
      visits: 0,
      spent: 0,
      costPerVisit: 0,
    });
    expect(Array.isArray(body.dailyImpressions)).toBe(true);
    expect(body.dailyImpressions).toHaveLength(7);
    expect(body.dailyImpressions.every((n: number) => n === 0)).toBe(true);
    expect(body.sentiment).toEqual({ positive: 0, neutral: 0, negative: 0 });
    expect(Array.isArray(body.recentActivity)).toBe(true);
  });

  it('aggregates impressions, clicks, claims, visits and spent within the week window', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzd3', phone: '+912000090003', username: 'bzd3' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Active Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const camp = await prisma.campaign.create({
      data: {
        businessId: biz.id,
        type: 'promotion',
        status: 'active',
        title: 'Test',
        budget: 1000,
        spent: 250,
      },
    });

    // Inside the 7-day window
    const recent = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days ago
    await prisma.campaignEvent.createMany({
      data: [
        { campaignId: camp.id, kind: 'impression', createdAt: recent },
        { campaignId: camp.id, kind: 'impression', createdAt: recent },
        { campaignId: camp.id, kind: 'impression', createdAt: recent },
        { campaignId: camp.id, kind: 'click', createdAt: recent },
        { campaignId: camp.id, kind: 'claim', createdAt: recent },
        { campaignId: camp.id, kind: 'visit', createdAt: recent },
      ],
    });
    // Outside the 7-day window — should NOT be counted in "week"
    const old = new Date(Date.now() - 1000 * 60 * 60 * 24 * 40); // 40 days ago
    await prisma.campaignEvent.create({ data: { campaignId: camp.id, kind: 'impression', createdAt: old } });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/dashboard?period=week',
      headers: { Authorization: devToken('dev-test-bzd3') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.kpis.impressions).toBe(3);
    expect(body.kpis.clicks).toBe(1);
    expect(body.kpis.claims).toBe(1);
    expect(body.kpis.visits).toBe(1);
    expect(body.kpis.spent).toBe(250);
    expect(body.kpis.ctr).toBeCloseTo(1 / 3, 3);
    expect(body.kpis.costPerVisit).toBe(250);
    expect(body.dailyImpressions.reduce((s: number, n: number) => s + n, 0)).toBe(3);
  });

  it('defaults to "week" when period query is omitted', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bzd4', phone: '+912000090004', username: 'bzd4' });
    await prisma.business.create({
      data: { name: 'BD_TEST_Default Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/dashboard',
      headers: { Authorization: devToken('dev-test-bzd4') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().period).toBe('week');
  });
});
