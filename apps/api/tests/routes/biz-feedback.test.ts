import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('/api/v1/biz/feedback', () => {
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
    const res = await getTestApp().inject({ method: 'GET', url: '/api/v1/biz/feedback' });
    expect(res.statusCode).toBe(401);
  });

  it('GET 403 when caller does not own a business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bdf1', phone: '+912000120001', username: 'bdf1' });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/feedback',
      headers: { Authorization: devToken('dev-test-bdf1') },
    });
    expect(res.statusCode).toBe(403);
  });

  it('GET lists tagged content, classifies sentiment, and respects the sentiment filter', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdf2', phone: '+912000120002', username: 'bdf2' });
    const author = await seedUser({ firebaseUid: 'dev-test-bdf2a', phone: '+912000120012', username: 'bdf2a' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Fb Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });

    await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'Loved it!',
        businessTagId: biz.id, moderationStatus: 'published', publishedAt: new Date(),
        likeCount: 12, dislikeCount: 1,
      },
    });
    await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'Could be better',
        businessTagId: biz.id, moderationStatus: 'published', publishedAt: new Date(),
        likeCount: 2, dislikeCount: 5,
      },
    });
    await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'Was fine',
        businessTagId: biz.id, moderationStatus: 'published', publishedAt: new Date(),
        likeCount: 3, dislikeCount: 3,
      },
    });

    // No filter — all three rows
    const all = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/feedback',
      headers: { Authorization: devToken('dev-test-bdf2') },
    });
    expect(all.statusCode).toBe(200);
    expect(all.json().items).toHaveLength(3);

    // Filter to positive only
    const positive = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/feedback?sentiment=positive',
      headers: { Authorization: devToken('dev-test-bdf2') },
    });
    expect(positive.statusCode).toBe(200);
    const items = positive.json().items;
    expect(items).toHaveLength(1);
    expect(items[0].sentiment).toBe('positive');
    expect(items[0].text).toBe('Loved it!');
  });

  it('POST reply persists a Comment by the owner and the next GET surfaces it', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdf3', phone: '+912000120003', username: 'bdf3' });
    const author = await seedUser({ firebaseUid: 'dev-test-bdf3a', phone: '+912000120013', username: 'bdf3a' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Reply Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const content = await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'Mediocre',
        businessTagId: biz.id, moderationStatus: 'published', publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/feedback/${content.id}/reply`,
      headers: { Authorization: devToken('dev-test-bdf3') },
      payload: { text: 'Thanks for the honest feedback!' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().reply.text).toBe('Thanks for the honest feedback!');

    const comments = await prisma.comment.findMany({ where: { contentId: content.id, userId: owner.id } });
    expect(comments).toHaveLength(1);
    expect(comments[0].text).toBe('Thanks for the honest feedback!');

    // Follow-up GET includes the reply on the feedback item
    const next = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/biz/feedback',
      headers: { Authorization: devToken('dev-test-bdf3') },
    });
    const item = next.json().items.find((i: { contentId: string }) => i.contentId === content.id);
    expect(item?.reply?.text).toBe('Thanks for the honest feedback!');
  });

  it('POST reply 403 when the content is not tagged to the caller\'s business', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdf4', phone: '+912000120004', username: 'bdf4' });
    const author = await seedUser({ firebaseUid: 'dev-test-bdf4a', phone: '+912000120014', username: 'bdf4a' });
    await prisma.business.create({
      data: { name: 'BD_TEST_NoTag Biz', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const orphan = await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'untagged',
        moderationStatus: 'published', publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/feedback/${orphan.id}/reply`,
      headers: { Authorization: devToken('dev-test-bdf4') },
      payload: { text: 'Cannot reply' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('POST reply 400 on empty text', async () => {
    const owner = await seedUser({ firebaseUid: 'dev-test-bdf5', phone: '+912000120005', username: 'bdf5' });
    const author = await seedUser({ firebaseUid: 'dev-test-bdf5a', phone: '+912000120015', username: 'bdf5a' });
    const biz = await prisma.business.create({
      data: { name: 'BD_TEST_Empty', category: 'cafe', pincode: '682016', ownerId: owner.id },
    });
    const content = await prisma.content.create({
      data: {
        userId: author.id, type: 'post', text: 'x',
        businessTagId: biz.id, moderationStatus: 'published', publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/biz/feedback/${content.id}/reply`,
      headers: { Authorization: devToken('dev-test-bdf5') },
      payload: { text: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});
