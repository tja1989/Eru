import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('POST /api/v1/content/create — subtype classifier', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('rejects a create call missing subtype with 400', async () => {
    await seedUser({ firebaseUid: 'dev-test-subtype1', phone: '+919300000001', username: 'tsubty1' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-subtype1'), 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post', text: 'Hello world' }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('persists subtype on the Content row when a valid value is passed', async () => {
    await seedUser({ firebaseUid: 'dev-test-subtype2', phone: '+919300000002', username: 'tsubty2' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-subtype2'), 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post', subtype: 'review', text: 'Great little bookshop' }),
    });
    expect(res.statusCode).toBe(201);
    const { content } = res.json();
    const fromDb = await prisma.content.findUnique({ where: { id: content.id } });
    expect(fromDb?.subtype).toBe('review');
    expect(fromDb?.commissionPctEarned).toBe(0);
  });

  it('rejects an unknown subtype value with 400', async () => {
    await seedUser({ firebaseUid: 'dev-test-subtype3', phone: '+919300000003', username: 'tsubty3' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-subtype3'), 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post', subtype: 'not_a_real_subtype', text: 'Nope' }),
    });
    expect(res.statusCode).toBe(400);
  });

  it('thread create — every child row inherits the same subtype as the parent', async () => {
    await seedUser({ firebaseUid: 'dev-test-subtype4', phone: '+919300000004', username: 'tsubty4' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-subtype4'), 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'thread',
        subtype: 'tutorial',
        threadParts: ['Step 1', 'Step 2', 'Step 3'],
      }),
    });
    expect(res.statusCode).toBe(201);
    const { content } = res.json();
    const children = await prisma.content.findMany({
      where: { threadParentId: content.id },
      orderBy: { threadPosition: 'asc' },
    });
    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.subtype).toBe('tutorial');
      expect(child.type).toBe('thread');
    }
    const parent = await prisma.content.findUnique({ where: { id: content.id } });
    expect(parent?.subtype).toBe('tutorial');
  });
});
