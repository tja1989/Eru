import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

// Tests for the handle-choice flow:
//   1. /auth/register always stores a `pending_*` placeholder + flag=true
//   2. Phone-collision branch preserves an existing real handle + flag
//   3. PUT /users/me/settings clears the flag when a real handle is set
//   4. PUT /users/me/settings rejects reserved/invalid handles
//   5. GET /users/handle-available reports correct availability + reasons
//   6. GET /users/me/onboarding-status surfaces needsHandleChoice

describe('handle flow', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  describe('POST /auth/register', () => {
    it('stores a pending_* placeholder and sets needsHandleChoice=true', async () => {
      const res = await getTestApp().inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: {
          firebaseUid: 'dev-test-reg1',
          phone: '+919999000001',
          name: 'New User',
          username: 'whatever_we_send_is_ignored',
        },
      });
      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.user.username).toMatch(/^pending_[a-f0-9]{10}$/);
      expect(body.user.needsHandleChoice).toBe(true);

      const fetched = await prisma.user.findUnique({
        where: { firebaseUid: 'dev-test-reg1' },
        select: { username: true, needsHandleChoice: true },
      });
      expect(fetched?.username).toMatch(/^pending_[a-f0-9]{10}$/);
      expect(fetched?.needsHandleChoice).toBe(true);
    });

    it('preserves existing username + flag on phone-collision (returning user)', async () => {
      await seedUser({
        firebaseUid: 'dev-test-reg2-old',
        phone: '+919999000002',
        username: 'real_handle_42',
      });
      // Manually mark as already-picked so we can verify it's preserved.
      await prisma.user.update({
        where: { firebaseUid: 'dev-test-reg2-old' },
        data: { needsHandleChoice: false },
      });

      const res = await getTestApp().inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        headers: { 'content-type': 'application/json' },
        payload: {
          firebaseUid: 'dev-test-reg2-new',
          phone: '+919999000002',
          name: 'Returning User',
          username: 'pending_xxxxxxxxxx',
        },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.user.username).toBe('real_handle_42');
      expect(body.user.needsHandleChoice).toBe(false);
    });
  });

  describe('PUT /users/me/settings', () => {
    it('clears needsHandleChoice when username is set to a real handle', async () => {
      const u = await seedUser({
        firebaseUid: 'dev-test-pick1',
        phone: '+919999000003',
        username: 'pending_aaaaaaaaaa',
      });
      // The schema default is true; seedUser doesn't override it.
      expect(u.needsHandleChoice).toBe(true);

      const res = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick1'), 'content-type': 'application/json' },
        payload: { username: 'tj.picked.handle' },
      });
      expect(res.statusCode).toBe(200);

      const after = await prisma.user.findUnique({
        where: { firebaseUid: 'dev-test-pick1' },
        select: { username: true, needsHandleChoice: true },
      });
      expect(after?.username).toBe('tj.picked.handle');
      expect(after?.needsHandleChoice).toBe(false);
    });

    it('rejects reserved handles (admin)', async () => {
      await seedUser({
        firebaseUid: 'dev-test-pick2',
        phone: '+919999000004',
        username: 'pending_bbbbbbbbbb',
      });
      const res = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick2'), 'content-type': 'application/json' },
        payload: { username: 'admin' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toMatch(/reserved/i);
    });

    it('rejects uppercase handles', async () => {
      await seedUser({
        firebaseUid: 'dev-test-pick3',
        phone: '+919999000005',
        username: 'pending_cccccccccc',
      });
      const res = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick3'), 'content-type': 'application/json' },
        payload: { username: 'JohnDoe' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects leading and trailing periods', async () => {
      await seedUser({
        firebaseUid: 'dev-test-pick4',
        phone: '+919999000006',
        username: 'pending_dddddddddd',
      });
      const res1 = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick4'), 'content-type': 'application/json' },
        payload: { username: '.starts_with_dot' },
      });
      expect(res1.statusCode).toBe(400);

      const res2 = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick4'), 'content-type': 'application/json' },
        payload: { username: 'ends_with_dot.' },
      });
      expect(res2.statusCode).toBe(400);
    });

    it('rejects consecutive periods', async () => {
      await seedUser({
        firebaseUid: 'dev-test-pick5',
        phone: '+919999000007',
        username: 'pending_eeeeeeeeee',
      });
      const res = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick5'), 'content-type': 'application/json' },
        payload: { username: 'has..dots' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects user-supplied pending_ prefix (reserved namespace)', async () => {
      await seedUser({
        firebaseUid: 'dev-test-pick6',
        phone: '+919999000008',
        username: 'pending_ffffffffff',
      });
      const res = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick6'), 'content-type': 'application/json' },
        payload: { username: 'pending_squat' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('does NOT clear needsHandleChoice when username is not in the payload', async () => {
      await seedUser({
        firebaseUid: 'dev-test-pick7',
        phone: '+919999000009',
        username: 'pending_gggggggggg',
      });
      const res = await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-pick7'), 'content-type': 'application/json' },
        payload: { bio: 'just updating bio' },
      });
      expect(res.statusCode).toBe(200);
      const after = await prisma.user.findUnique({
        where: { firebaseUid: 'dev-test-pick7' },
        select: { needsHandleChoice: true },
      });
      expect(after?.needsHandleChoice).toBe(true);
    });
  });

  describe('GET /users/handle-available', () => {
    it('returns available=true for a free handle', async () => {
      await seedUser({
        firebaseUid: 'dev-test-avail1',
        phone: '+919999000010',
        username: 'avail1seed',
      });
      const res = await getTestApp().inject({
        method: 'GET',
        url: '/api/v1/users/handle-available?handle=brand.new.handle',
        headers: { Authorization: devToken('dev-test-avail1') },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ available: true });
    });

    it('returns available=false (no reason) for a taken handle', async () => {
      await seedUser({
        firebaseUid: 'dev-test-avail2',
        phone: '+919999000011',
        username: 'taken.handle',
      });
      await seedUser({
        firebaseUid: 'dev-test-avail3',
        phone: '+919999000012',
        username: 'avail3seed',
      });
      const res = await getTestApp().inject({
        method: 'GET',
        url: '/api/v1/users/handle-available?handle=taken.handle',
        headers: { Authorization: devToken('dev-test-avail3') },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.available).toBe(false);
      expect(body.reason).toBeUndefined();
    });

    it('returns available=false with reason for a reserved handle', async () => {
      await seedUser({
        firebaseUid: 'dev-test-avail4',
        phone: '+919999000013',
        username: 'avail4seed',
      });
      const res = await getTestApp().inject({
        method: 'GET',
        url: '/api/v1/users/handle-available?handle=admin',
        headers: { Authorization: devToken('dev-test-avail4') },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.available).toBe(false);
      expect(body.reason).toMatch(/reserved/i);
    });
  });

  describe('GET /users/me/onboarding-status', () => {
    it('exposes needsHandleChoice', async () => {
      await seedUser({
        firebaseUid: 'dev-test-status1',
        phone: '+919999000014',
        username: 'pending_hhhhhhhhhh',
      });
      const res = await getTestApp().inject({
        method: 'GET',
        url: '/api/v1/users/me/onboarding-status',
        headers: { Authorization: devToken('dev-test-status1') },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveProperty('complete');
      expect(body.needsHandleChoice).toBe(true);
    });

    it('reports needsHandleChoice=false after the user picks a real handle', async () => {
      await seedUser({
        firebaseUid: 'dev-test-status2',
        phone: '+919999000015',
        username: 'pending_iiiiiiiiii',
      });
      // Pick a handle.
      await getTestApp().inject({
        method: 'PUT',
        url: '/api/v1/users/me/settings',
        headers: { Authorization: devToken('dev-test-status2'), 'content-type': 'application/json' },
        payload: { username: 'real.handle.now' },
      });

      const res = await getTestApp().inject({
        method: 'GET',
        url: '/api/v1/users/me/onboarding-status',
        headers: { Authorization: devToken('dev-test-status2') },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().needsHandleChoice).toBe(false);
    });
  });
});
