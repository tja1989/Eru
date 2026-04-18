import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { seedUser, cleanupTestData } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';
import { sponsorshipService } from '../../src/services/sponsorshipService.js';

describe('sponsorshipService', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.sponsorshipProposal.deleteMany({});
    await prisma.business.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('creates a proposal with status=pending and 20% commission', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp1', phone: '+911300000001', username: 'tsp1' });
    const biz = await prisma.business.create({
      data: { name: 'B', category: 'X', pincode: '682016' },
    });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 3000);
    expect(p.status).toBe('pending');
    expect(Number(p.commissionPct)).toBe(20);
    expect(Number(p.creatorEarnings)).toBe(600);
  });

  it('accept() flips status to accepted', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp2', phone: '+911300000002', username: 'tsp2' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 1000);
    const after = await sponsorshipService.accept(p.id, creator.id);
    expect(after.status).toBe('accepted');
  });

  it('decline() flips status to declined', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp3', phone: '+911300000003', username: 'tsp3' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p = await sponsorshipService.createProposal(biz.id, creator.id, 1000);
    const after = await sponsorshipService.decline(p.id, creator.id);
    expect(after.status).toBe('declined');
  });

  it('getCreatorDashboard returns aggregates', async () => {
    const creator = await seedUser({ firebaseUid: 'dev-test-sp4', phone: '+911300000004', username: 'tsp4' });
    const biz = await prisma.business.create({ data: { name: 'B', category: 'X', pincode: '682016' } });
    const p1 = await sponsorshipService.createProposal(biz.id, creator.id, 3000);
    await sponsorshipService.accept(p1.id, creator.id);
    const data = await sponsorshipService.getCreatorDashboard(creator.id);
    expect(data.activeCount).toBe(1);
    expect(Number(data.totalEarnings)).toBe(600);
  });
});
