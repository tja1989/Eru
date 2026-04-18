import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';
import { sponsorshipService } from '../../src/services/sponsorshipService.js';

describe('Sponsorship routes', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.sponsorshipProposal.deleteMany({});
    await prisma.business.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('GET /sponsorship/dashboard returns aggregates for the authed user', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-spr1', phone: '+911300001001', username: 'tspr1' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    await sponsorshipService.createProposal(biz.id, creator.id, 1500);
    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/sponsorship/dashboard',
      headers: { Authorization: devToken('dev-test-spr1') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().pendingCount).toBe(1);
    expect(Number(res.json().totalEarnings)).toBe(0); // pending proposals don't count
  });

  it('POST /sponsorship/:id/accept flips status to accepted', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-spr2', phone: '+911300001002', username: 'tspr2' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 2000);
    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/sponsorship/${p.id}/accept`,
      headers: { Authorization: devToken('dev-test-spr2') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().proposal.status).toBe('accepted');
  });

  it('POST /sponsorship/:id/decline by non-creator returns 403', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-spr3a', phone: '+911300001003', username: 'tspr3a' });
    const stranger = await seedUser({ firebaseUid: 'dev-test-spr3b', phone: '+911300001004', username: 'tspr3b' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 1000);
    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/sponsorship/${p.id}/decline`,
      headers: { Authorization: devToken('dev-test-spr3b') },
    });
    expect(res.statusCode).toBe(403);
  });
});
