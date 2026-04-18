import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Tagged users — POST /content/create + GET /users/:id/content?tab=tagged', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  // ── POST /content/create with taggedUserIds ──────────────────────────────────

  it('creates content with taggedUserIds populated', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-tag1a', phone: '+919800000001', username: 'ttag1a' });
    const tagged = await seedUser({ firebaseUid: 'dev-test-tag1b', phone: '+919800000002', username: 'ttag1b' });

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-tag1a'), 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post', text: 'Check this out!', taggedUserIds: [tagged.id] }),
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.content.taggedUserIds).toEqual([tagged.id]);

    // Double-check directly in DB
    const fromDb = await prisma.content.findUnique({ where: { id: body.content.id } });
    expect(fromDb?.taggedUserIds).toEqual([tagged.id]);
  });

  it('returns 400 when taggedUserIds contains a non-existent userId', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-tag2', phone: '+919800000003', username: 'ttag2' });
    const fakeId = '00000000-0000-0000-0000-000000000099';

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-tag2'), 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post', text: 'Hello', taggedUserIds: [fakeId] }),
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 when more than 10 users are tagged (validator max)', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-tag3', phone: '+919800000004', username: 'ttag3' });
    // 11 fake UUIDs — validator rejects before hitting the DB
    const tooMany = Array.from({ length: 11 }, (_, i) =>
      `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`
    );

    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/create',
      headers: { Authorization: devToken('dev-test-tag3'), 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'post', text: 'Hello', taggedUserIds: tooMany }),
    });

    expect(res.statusCode).toBe(400);
  });

  // ── GET /users/:id/content?tab=tagged ────────────────────────────────────────

  it('returns content where the user appears in taggedUserIds', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-tag4a', phone: '+919800000005', username: 'ttag4a' });
    const viewer = await seedUser({ firebaseUid: 'dev-test-tag4b', phone: '+919800000006', username: 'ttag4b' });

    // Create a published post that tags viewer
    await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'Tagging you',
        moderationStatus: 'published',
        publishedAt: new Date(),
        taggedUserIds: [viewer.id],
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/users/${viewer.id}/content?tab=tagged`,
      headers: { Authorization: devToken('dev-test-tag4b') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.content).toHaveLength(1);
    expect(body.content[0].taggedUserIds).toContain(viewer.id);
  });

  it('does NOT return posts where the user is the author but not in taggedUserIds', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-tag5', phone: '+919800000007', username: 'ttag5' });

    // Post authored by user but taggedUserIds is empty — should NOT show in tagged tab
    await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'My own post',
        moderationStatus: 'published',
        publishedAt: new Date(),
        taggedUserIds: [],
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/users/${author.id}/content?tab=tagged`,
      headers: { Authorization: devToken('dev-test-tag5') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().content).toHaveLength(0);
  });

  it('does NOT return pending/declined content in tagged tab (only published)', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-tag6a', phone: '+919800000008', username: 'ttag6a' });
    const viewer = await seedUser({ firebaseUid: 'dev-test-tag6b', phone: '+919800000009', username: 'ttag6b' });

    // Pending post tagging viewer — should NOT appear
    await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'Pending tag',
        moderationStatus: 'pending',
        publishedAt: null,
        taggedUserIds: [viewer.id],
      },
    });

    // Declined post tagging viewer — should NOT appear
    await prisma.content.create({
      data: {
        userId: author.id,
        type: 'post',
        text: 'Declined tag',
        moderationStatus: 'declined',
        publishedAt: null,
        taggedUserIds: [viewer.id],
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/users/${viewer.id}/content?tab=tagged`,
      headers: { Authorization: devToken('dev-test-tag6b') },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().content).toHaveLength(0);
  });
});
