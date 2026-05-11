import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('/api/v1/biz/ugc', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
  }, 60_000);

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({ where: { name: { startsWith: 'BD_TEST_' } } });
    await closeTestApp();
  }, 60_000);

  it('GET 401 without a token', async () => {
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/ugc' });
    expect(res.statusCode).toBe(401);
  });

  it('GET 403 when caller does not own a business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bdu1', phone: '+912000110001', username: 'bdu1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/ugc',
      headers: { Authorization: devToken('dev-test-bdu1') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET lists content tagged to the owner\'s business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdu2', phone: '+912000110002', username: 'bdu2' });
    const author = await seedUser({ firebaseUid: 'dev-test-bdu2a', phone: '+912000110012', username: 'bdu2a' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_UGC Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'Loved this cafe!',
        businessTagId: biz.id,
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/ugc',
      headers: { Authorization: devToken('dev-test-bdu2') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.stats.tagged).toBe(1);
    expect(body.newTags).toHaveLength(1);
    expect(body.newTags[0].text).toBe('Loved this cafe!');
    expect(body.newTags[0].authorUsername).toBe('bdu2a');
    expect(body.newTags[0].isSponsored).toBe(false);
    expect(body.activeSponsorships).toHaveLength(0);
  });

  it('POST boost creates a SponsorshipProposal for content tagged to the business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdu3', phone: '+912000110003', username: 'bdu3' });
    const author = await seedUser({ firebaseUid: 'dev-test-bdu3a', phone: '+912000110013', username: 'bdu3a' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Boost Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const content = await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'Great food!',
        businessTagId: biz.id,
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/ugc/${content.id}/boost`,
      headers: { Authorization: devToken('dev-test-bdu3') },
      payload: { amount: 250 },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.proposalId).toBeTruthy();

    const proposals = await prisma.sponsorshipProposal.findMany({ where: { businessId: biz.id } });
    expect(proposals).toHaveLength(1);
    expect(Number(proposals[0].boostAmount)).toBe(250);
    expect(proposals[0].contentId).toBe(content.id);
    expect(proposals[0].creatorId).toBe(author.id);
  });

  it('POST boost returns 404 when content is not tagged to the caller\'s business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdu4', phone: '+912000110004', username: 'bdu4' });
    const otherAuthor = await seedUser({ firebaseUid: 'dev-test-bdu4a', phone: '+912000110014', username: 'bdu4a' });
    await prisma.business.create({
      data: { name: 'BD_TEST_NoMatch Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    // Content tagged to NO business at all
    const orphan = await prisma.content.create({
      data: {
        userId: otherAuthor.id,
        type: 'post',
        text: 'Untagged',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/ugc/${orphan.id}/boost`,
      headers: { Authorization: devToken('dev-test-bdu4') },
      payload: { amount: 100 },
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST boost 400 on invalid payload (missing amount)', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdu5', phone: '+912000110005', username: 'bdu5' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_BadInput', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const author = await seedUser({ firebaseUid: 'dev-test-bdu5a', phone: '+912000110015', username: 'bdu5a' });
    const content = await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'x', businessTagId: biz.id,
        moderationStatus: 'published', publishedAt: new Date(),
      },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/ugc/${content.id}/boost`,
      headers: { Authorization: devToken('dev-test-bdu5') },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
