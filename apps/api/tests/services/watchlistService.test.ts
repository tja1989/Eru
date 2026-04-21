import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { watchlistService } from '../../src/services/watchlistService.js';
import { cleanupTestData, seedUser } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

afterAll(async () => {
  await cleanupTestData();
});

describe('watchlistService.addAndList', () => {
  beforeEach(cleanupTestData);

  it('adds a business to the user watchlist and lists it back', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wl1', phone: '+912000010001', username: 'wl1' });
    const business = await prisma.business.create({
      data: { name: 'Kashi Bakes', category: 'bakery', pincode: '682016' },
    });

    const added = await watchlistService.add(user.id, business.id);
    expect(added.businessId).toBe(business.id);
    expect(added.businessName).toBe('Kashi Bakes');
    expect(added.notifyOnOffers).toBe(true);

    const list = await watchlistService.listForUser(user.id);
    expect(list.items).toHaveLength(1);
    expect(list.items[0].businessName).toBe('Kashi Bakes');
    expect(list.total).toBe(1);

    // clean the business we created
    await prisma.watchlist.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
  });

  it('is idempotent — adding the same business twice does not create duplicates', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wl2', phone: '+912000010002', username: 'wl2' });
    const business = await prisma.business.create({ data: { name: 'B', category: 'test', pincode: '682016' } });

    await watchlistService.add(user.id, business.id);
    await watchlistService.add(user.id, business.id);

    const list = await watchlistService.listForUser(user.id);
    expect(list.items).toHaveLength(1);

    await prisma.watchlist.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
  });

  it('remove deletes the watchlist entry', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wl3', phone: '+912000010003', username: 'wl3' });
    const business = await prisma.business.create({ data: { name: 'C', category: 'test', pincode: '682001' } });
    await watchlistService.add(user.id, business.id);
    await watchlistService.remove(user.id, business.id);
    const list = await watchlistService.listForUser(user.id);
    expect(list.items).toHaveLength(0);

    await prisma.business.delete({ where: { id: business.id } });
  });

  it('setNotifyPreference toggles the flag', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-wl4', phone: '+912000010004', username: 'wl4' });
    const business = await prisma.business.create({ data: { name: 'D', category: 'test', pincode: '682001' } });
    await watchlistService.add(user.id, business.id);
    await watchlistService.setNotifyPreference(user.id, business.id, false);

    const list = await watchlistService.listForUser(user.id);
    expect(list.items[0].notifyOnOffers).toBe(false);

    await prisma.watchlist.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
  });
});
