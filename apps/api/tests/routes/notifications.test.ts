import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

async function seedNotification(userId: string, overrides: Partial<{
  type: string;
  title: string;
  body: string;
  isRead: boolean;
}> = {}) {
  return prisma.notification.create({
    data: {
      userId,
      type: overrides.type ?? 'points_earned',
      title: overrides.title ?? 'Points!',
      body: overrides.body ?? 'You earned points.',
      isRead: overrides.isRead ?? false,
    },
  });
}

describe('GET /api/v1/notifications', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
  });

  it('returns the users notifications newest first', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notif1',
      phone: '+919100000001',
      username: 'tnotif1',
    });
    await seedNotification(user.id, { title: 'old', body: 'old' });
    // Sleep 10ms so createdAt differs
    await new Promise((r) => setTimeout(r, 10));
    await seedNotification(user.id, { title: 'new', body: 'new' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { Authorization: devToken('dev-test-notif1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.notifications).toHaveLength(2);
    expect(body.notifications[0].title).toBe('new');
  });

  it('returns an unread count', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notif2',
      phone: '+919100000002',
      username: 'tnotif2',
    });
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: false });
    await seedNotification(user.id, { isRead: true });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { Authorization: devToken('dev-test-notif2') },
    });

    expect(res.json().unreadCount).toBe(2);
  });

  it("does not return another user's notifications", async () => {
    const app = getTestApp();
    const user1 = await seedUser({
      firebaseUid: 'dev-test-notif3',
      phone: '+919100000003',
      username: 'tnotif3',
    });
    const user2 = await seedUser({
      firebaseUid: 'dev-test-notif4',
      phone: '+919100000004',
      username: 'tnotif4',
    });
    await seedNotification(user2.id, { title: 'user2 only' });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications',
      headers: { Authorization: devToken('dev-test-notif3') },
    });
    expect(res.json().notifications).toHaveLength(0);
  });

  it('paginates', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notif5',
      phone: '+919100000005',
      username: 'tnotif5',
    });
    for (let i = 0; i < 25; i++) await seedNotification(user.id);

    const page1 = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications?page=1&limit=20',
      headers: { Authorization: devToken('dev-test-notif5') },
    });
    const page2 = await app.inject({
      method: 'GET',
      url: '/api/v1/notifications?page=2&limit=20',
      headers: { Authorization: devToken('dev-test-notif5') },
    });

    expect(page1.json().notifications).toHaveLength(20);
    expect(page2.json().notifications).toHaveLength(5);
  });
});

describe('PUT /api/v1/notifications/read', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('marks the given ids as read', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-notifread',
      phone: '+919100000099',
      username: 'tnotifread',
    });
    const n1 = await seedNotification(user.id, { isRead: false });
    const n2 = await seedNotification(user.id, { isRead: false });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/notifications/read',
      headers: { Authorization: devToken('dev-test-notifread') },
      payload: { ids: [n1.id, n2.id] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().updated).toBe(2);

    const afterN1 = await prisma.notification.findUnique({ where: { id: n1.id } });
    expect(afterN1?.isRead).toBe(true);
  });

  it("cannot mark another user's notifications as read", async () => {
    const app = getTestApp();
    const user1 = await seedUser({
      firebaseUid: 'dev-test-notifr1',
      phone: '+919100000088',
      username: 'tnotifr1',
    });
    const user2 = await seedUser({
      firebaseUid: 'dev-test-notifr2',
      phone: '+919100000087',
      username: 'tnotifr2',
    });
    const n = await seedNotification(user2.id, { isRead: false });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/notifications/read',
      headers: { Authorization: devToken('dev-test-notifr1') },
      payload: { ids: [n.id] },
    });
    expect(res.json().updated).toBe(0);

    const after = await prisma.notification.findUnique({ where: { id: n.id } });
    expect(after?.isRead).toBe(false);
  });
});
