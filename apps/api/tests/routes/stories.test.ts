import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Stories routes', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.story.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('POST /stories creates a story for the authed user', async () => {
    await seedUser({ firebaseUid: 'dev-test-str1', phone: '+911400001001', username: 'tstr1' });
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/stories',
      headers: { Authorization: devToken('dev-test-str1') },
      payload: { mediaUrl: 'https://media/x.jpg' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().story.mediaUrl).toBe('https://media/x.jpg');
  });

  it('GET /stories returns the auth users feed', async () => {
    const me = await seedUser({ firebaseUid: 'dev-test-str2', phone: '+911400001002', username: 'tstr2' });
    await prisma.story.create({ data: { userId: me.id, mediaUrl: 'u', expiresAt: new Date(Date.now() + 60000) } });
    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/stories',
      headers: { Authorization: devToken('dev-test-str2') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().stories).toHaveLength(1);
  });

  it('POST /stories/:id/view marks a view', async () => {
    const viewer = await seedUser({ firebaseUid: 'dev-test-str3a', phone: '+911400001003', username: 'tstr3a' });
    const author = await seedUser({ firebaseUid: 'dev-test-str3b', phone: '+911400001004', username: 'tstr3b' });
    const story = await prisma.story.create({
      data: { userId: author.id, mediaUrl: 'x', expiresAt: new Date(Date.now() + 60000) },
    });
    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/stories/${story.id}/view`,
      headers: { Authorization: devToken('dev-test-str3a') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
    const view = await prisma.storyView.findUnique({
      where: { storyId_viewerId: { storyId: story.id, viewerId: viewer.id } },
    });
    expect(view).not.toBeNull();
  });
});
