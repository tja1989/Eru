import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

vi.mock('../../src/services/transcodeService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/transcodeService.js')>();
  return { ...actual, triggerTranscode: vi.fn().mockResolvedValue(undefined) };
});

describe('POST /api/v1/content/create — businessTagId', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
    await closeTestApp();
  });

  it('accepts businessTagId and persists it on the content row', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bt1', phone: '+912000030001', username: 'bt1' });
    const biz = await prisma.business.create({
      data: { name: 'Kashi Bakes', category: 'bakery', pincode: '682016' },
    });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-bt1') },
      payload: {
        type: 'post',
        subtype: 'review',
        text: 'Best plum cake in Kochi',
        businessTagId: biz.id,
        mediaIds: [],
        hashtags: [],
      },
    });

    expect(res.statusCode).toBe(201);
    const content = await prisma.content.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(content?.businessTagId).toBe(biz.id);
  });

  it('rejects 400 when businessTagId refers to a non-existent business', async () => {
    await seedUser({ firebaseUid: 'dev-test-bt2', phone: '+912000030002', username: 'bt2' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-bt2') },
      payload: {
        type: 'post',
        subtype: 'review',
        text: 'text',
        businessTagId: '00000000-0000-0000-0000-000000000000',
        mediaIds: [],
        hashtags: [],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('omitting businessTagId is still allowed — legacy payloads continue to work', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bt3', phone: '+912000030003', username: 'bt3' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-bt3') },
      payload: {
        type: 'post',
        subtype: 'recommendation',
        text: 'no business tag',
        mediaIds: [],
        hashtags: [],
      },
    });
    expect(res.statusCode).toBe(201);
    const content = await prisma.content.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(content?.businessTagId).toBeNull();
  });
});

describe('GET /api/v1/content/:id — includes businessTag join', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.business.deleteMany({});
  });

  it('returns businessTag { id, name, avatarUrl } on the content detail', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bt4', phone: '+912000030004', username: 'bt4' });
    const biz = await prisma.business.create({
      data: { name: 'Brew District', category: 'cafe', pincode: '682001', avatarUrl: 'https://x/brew.png' },
    });
    const content = await prisma.content.create({
      data: {
        userId: user.id,
        type: 'post',
        subtype: 'review',
        text: 'Great coffee',
        businessTagId: biz.id,
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/content/${content.id}`,
      headers: { Authorization: devToken('dev-test-bt4') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.content.businessTag).toEqual({
      id: biz.id,
      name: 'Brew District',
      avatarUrl: 'https://x/brew.png',
      category: 'cafe',
      pincode: '682001',
    });
  });

  it('returns businessTag = null when the content has no tag', async () => {
    const user = await seedUser({ firebaseUid: 'dev-test-bt5', phone: '+912000030005', username: 'bt5' });
    const content = await prisma.content.create({
      data: {
        userId: user.id,
        type: 'post',
        subtype: 'meme',
        text: 'lol',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/content/${content.id}`,
      headers: { Authorization: devToken('dev-test-bt5') },
    });

    const body = res.json();
    expect(body.content.businessTag).toBeNull();
  });
});
