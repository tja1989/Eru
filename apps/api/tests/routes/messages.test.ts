import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Messages routes', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('POST /conversations creates a new conversation with a target user', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr1a', phone: '+911200001001', username: 'tmr1a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr1b', phone: '+911200001002', username: 'tmr1b' });
    const res = await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr1a') },
      payload: { targetUserId: b.id },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().conversation.id).toBeDefined();
  });

  it('POST /conversations/:id/messages sends a message', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr2a', phone: '+911200001003', username: 'tmr2a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr2b', phone: '+911200001004', username: 'tmr2b' });
    const convRes = await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr2a') },
      payload: { targetUserId: b.id },
    });
    const convId = convRes.json().conversation.id;

    const res = await getTestApp().inject({
      method: 'POST', url: `/api/v1/conversations/${convId}/messages`,
      headers: { Authorization: devToken('dev-test-mr2a') },
      payload: { text: 'hey' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().message.text).toBe('hey');
  });

  it('GET /conversations lists user conversations', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr3a', phone: '+911200001005', username: 'tmr3a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr3b', phone: '+911200001006', username: 'tmr3b' });
    await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr3a') },
      payload: { targetUserId: b.id },
    });
    const res = await getTestApp().inject({
      method: 'GET', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr3a') },
    });
    expect(res.json().conversations).toHaveLength(1);
  });

  it("a third user cannot read someone else's conversation", async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-mr4a', phone: '+911200001007', username: 'tmr4a' });
    const b = await seedUser({ firebaseUid: 'dev-test-mr4b', phone: '+911200001008', username: 'tmr4b' });
    const c = await seedUser({ firebaseUid: 'dev-test-mr4c', phone: '+911200001009', username: 'tmr4c' });
    const convRes = await getTestApp().inject({
      method: 'POST', url: '/api/v1/conversations',
      headers: { Authorization: devToken('dev-test-mr4a') },
      payload: { targetUserId: b.id },
    });
    const convId = convRes.json().conversation.id;

    const res = await getTestApp().inject({
      method: 'GET', url: `/api/v1/conversations/${convId}/messages`,
      headers: { Authorization: devToken('dev-test-mr4c') },
    });
    expect(res.statusCode).toBe(403);
  });
});
