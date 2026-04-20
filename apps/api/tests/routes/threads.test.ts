import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Thread endpoints', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => { await cleanupTestData(); await closeTestApp(); });

  // ── Thread creation ─────────────────────────────────────────────────────────

  describe('POST /api/v1/content/create — thread type', () => {
    it('creating a thread with 3 parts persists 3 Content rows with correct thread fields', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr1a', phone: '+919200000001', username: 'tthr1a' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr1a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          threadParts: ['First part of the thread', 'Second part of the thread', 'Third part of the thread'],
        }),
      });

      expect(res.statusCode).toBe(201);
      const { content } = res.json();
      expect(content).toBeDefined();
      expect(content.type).toBe('thread');
      expect(content.threadPosition).toBe(0);
      expect(content.threadParentId).toBeNull();

      // Fetch all parts including children
      const allParts = await prisma.content.findMany({
        where: { OR: [{ id: content.id }, { threadParentId: content.id }] },
        orderBy: { threadPosition: 'asc' },
      });

      expect(allParts).toHaveLength(3);

      // Parent (position 0)
      expect(allParts[0].threadPosition).toBe(0);
      expect(allParts[0].threadParentId).toBeNull();
      expect(allParts[0].text).toBe('First part of the thread');

      // Child 1 (position 1)
      expect(allParts[1].threadPosition).toBe(1);
      expect(allParts[1].threadParentId).toBe(content.id);
      expect(allParts[1].text).toBe('Second part of the thread');

      // Child 2 (position 2)
      expect(allParts[2].threadPosition).toBe(2);
      expect(allParts[2].threadParentId).toBe(content.id);
      expect(allParts[2].text).toBe('Third part of the thread');

      // All parts belong to the same user
      const userIds = allParts.map(p => p.userId);
      expect(new Set(userIds).size).toBe(1);
    });

    it('creating a thread with 1 part returns 400 (below minimum of 2)', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr2a', phone: '+919200000002', username: 'tthr2a' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr2a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          threadParts: ['Only one part'],
        }),
      });

      expect(res.statusCode).toBe(400);
    });

    it('creating a thread with 11 parts returns 400 (above cap of 10)', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr3a', phone: '+919200000003', username: 'tthr3a' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr3a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          threadParts: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
        }),
      });

      expect(res.statusCode).toBe(400);
    });

    it('creating a non-thread type with threadParts returns 400', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr4a', phone: '+919200000004', username: 'tthr4a' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr4a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'post', subtype: 'hot_take',
          text: 'Just a post',
          threadParts: ['Part A', 'Part B'],
        }),
      });

      expect(res.statusCode).toBe(400);
    });

    it('creating a thread type without threadParts returns 400', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr5a', phone: '+919200000005', username: 'tthr5a' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr5a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          text: 'Just a text field, no threadParts',
        }),
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects a poll body that also includes threadParts', async () => {
      await seedUser({ firebaseUid: 'dev-test-thrpoll1', phone: '+912600000010', username: 'tthrpoll1' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thrpoll1'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'poll', subtype: 'hot_take',
          pollOptions: ['A', 'B'],
          threadParts: ['X', 'Y'],
          mediaIds: [],
          hashtags: [],
        }),
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects a thread body that also includes pollOptions', async () => {
      await seedUser({ firebaseUid: 'dev-test-thrpoll2', phone: '+912600000011', username: 'tthrpoll2' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thrpoll2'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          threadParts: ['X', 'Y'],
          pollOptions: ['A', 'B'],
          mediaIds: [],
          hashtags: [],
        }),
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET /content/:id/thread ─────────────────────────────────────────────────

  describe('GET /api/v1/content/:id/thread', () => {
    it('with the parent id returns all parts in threadPosition order', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr6a', phone: '+919200000006', username: 'tthr6a' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr6a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          threadParts: ['Alpha', 'Beta', 'Gamma'],
        }),
      });
      expect(createRes.statusCode).toBe(201);
      const { content: parent } = createRes.json();

      const getRes = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${parent.id}/thread`,
        headers: { Authorization: devToken('dev-test-thr6a') },
      });

      expect(getRes.statusCode).toBe(200);
      const body = getRes.json();
      expect(body.parent).toBeDefined();
      expect(body.parent.id).toBe(parent.id);
      expect(body.parts).toHaveLength(3);
      expect(body.parts[0].threadPosition).toBe(0);
      expect(body.parts[0].text).toBe('Alpha');
      expect(body.parts[1].threadPosition).toBe(1);
      expect(body.parts[1].text).toBe('Beta');
      expect(body.parts[2].threadPosition).toBe(2);
      expect(body.parts[2].text).toBe('Gamma');
    });

    it('with a child id resolves to parent and returns all parts in order', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr7a', phone: '+919200000007', username: 'tthr7a' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-thr7a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'thread', subtype: 'tutorial',
          threadParts: ['First', 'Second', 'Third'],
        }),
      });
      expect(createRes.statusCode).toBe(201);
      const { content: parent } = createRes.json();

      // Get one of the child parts
      const childPart = await prisma.content.findFirst({
        where: { threadParentId: parent.id, threadPosition: 2 },
      });
      expect(childPart).not.toBeNull();

      // Query using the child's id
      const getRes = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${childPart!.id}/thread`,
        headers: { Authorization: devToken('dev-test-thr7a') },
      });

      expect(getRes.statusCode).toBe(200);
      const body = getRes.json();
      expect(body.parent.id).toBe(parent.id);
      expect(body.parts).toHaveLength(3);
      expect(body.parts[0].threadPosition).toBe(0);
      expect(body.parts[1].threadPosition).toBe(1);
      expect(body.parts[2].threadPosition).toBe(2);
    });

    it('with an unknown id returns 404', async () => {
      await seedUser({ firebaseUid: 'dev-test-thr8a', phone: '+919200000008', username: 'tthr8a' });

      const getRes = await getTestApp().inject({
        method: 'GET', url: '/api/v1/content/00000000-0000-0000-0000-000000000999/thread',
        headers: { Authorization: devToken('dev-test-thr8a') },
      });

      expect(getRes.statusCode).toBe(404);
    });
  });
});
