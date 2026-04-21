import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

// ---------------------------------------------------------------------------
// The post-detail PWA screen shows a "Most liked ▾" dropdown. That switches
// the comment order between top (likeCount DESC, then recency) and recent
// (createdAt DESC). Default order is preserved for existing callers that
// don't pass a sort param — ascending-createdAt.
// ---------------------------------------------------------------------------
describe('GET /api/v1/posts/:id/comments — sort', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  async function seedThreeCommentsOn(postId: string, authorUid: string) {
    const commenter = await seedUser({
      firebaseUid: authorUid,
      phone: `+91${Math.floor(Math.random() * 1e10)}`.slice(0, 13),
      username: authorUid.slice(-10),
    });
    const c1 = await prisma.comment.create({
      data: { userId: commenter.id, contentId: postId, text: 'oldest', likeCount: 2, createdAt: new Date(Date.now() - 3 * 60_000) },
    });
    const c2 = await prisma.comment.create({
      data: { userId: commenter.id, contentId: postId, text: 'middle', likeCount: 10, createdAt: new Date(Date.now() - 2 * 60_000) },
    });
    const c3 = await prisma.comment.create({
      data: { userId: commenter.id, contentId: postId, text: 'newest', likeCount: 5, createdAt: new Date(Date.now() - 1 * 60_000) },
    });
    return { c1, c2, c3 };
  }

  it('sort=top returns comments ordered by likeCount DESC', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs1', phone: '+912000080001', username: 'cs1' });
    const post = await seedContent(u.id);
    await seedThreeCommentsOn(post.id, 'dev-test-cs1-commenter');

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/posts/${post.id}/comments?sort=top`,
      headers: { Authorization: devToken('dev-test-cs1') },
    });
    expect(res.statusCode).toBe(200);
    const texts = res.json().comments.map((c: { text: string }) => c.text);
    expect(texts).toEqual(['middle', 'newest', 'oldest']); // 10, 5, 2
  });

  it('sort=recent returns comments ordered by createdAt DESC', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs2', phone: '+912000080002', username: 'cs2' });
    const post = await seedContent(u.id);
    await seedThreeCommentsOn(post.id, 'dev-test-cs2-commenter');

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/posts/${post.id}/comments?sort=recent`,
      headers: { Authorization: devToken('dev-test-cs2') },
    });
    const texts = res.json().comments.map((c: { text: string }) => c.text);
    expect(texts).toEqual(['newest', 'middle', 'oldest']);
  });

  it('default (no sort) preserves the current createdAt ASC order', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs3', phone: '+912000080003', username: 'cs3' });
    const post = await seedContent(u.id);
    await seedThreeCommentsOn(post.id, 'dev-test-cs3-commenter');

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-cs3') },
    });
    const texts = res.json().comments.map((c: { text: string }) => c.text);
    expect(texts).toEqual(['oldest', 'middle', 'newest']);
  });

  it('unknown sort value → 400', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-cs4', phone: '+912000080004', username: 'cs4' });
    const post = await seedContent(u.id);

    const res = await getTestApp().inject({
      method: 'GET',
      url: `/api/v1/posts/${post.id}/comments?sort=garbage`,
      headers: { Authorization: devToken('dev-test-cs4') },
    });
    expect(res.statusCode).toBe(400);
  });
});
