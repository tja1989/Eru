import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

// ---------------------------------------------------------------------------
// Comments that demonstrate thought (≥ 10 words) earn +3 pts — the PWA's
// "Add a comment... (+3 pts for 10+ words)" contract. One-liners get 0.
// Word-count gating lives on the server (not the client) so nobody can
// earn the reward by typing 15 letters and reporting "ten words" to the
// API from a custom client.
// ---------------------------------------------------------------------------
describe('POST /api/v1/posts/:id/comments — points awarding', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('credits +3 pts when the comment has ≥ 10 words', async () => {
    const app = getTestApp();
    const author = await seedUser({
      firebaseUid: 'dev-test-cmpts1',
      phone: '+919000090001',
      username: 'cmpts1',
    });
    const post = await seedContent(author.id);
    const commenter = await seedUser({
      firebaseUid: 'dev-test-cmpts1b',
      phone: '+919000090002',
      username: 'cmpts1b',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-cmpts1b') },
      payload: {
        text: 'This is a genuinely thoughtful comment with exactly more than ten words included here.',
      },
    });

    expect(res.statusCode).toBe(201);
    const ledger = await prisma.pointsLedger.findMany({
      where: { userId: commenter.id, actionType: 'comment' },
    });
    expect(ledger).toHaveLength(1);
    expect(ledger[0].points).toBe(3);
    expect(ledger[0].contentId).toBe(post.id);
  });

  it('credits 0 pts when the comment has < 10 words', async () => {
    const app = getTestApp();
    const author = await seedUser({
      firebaseUid: 'dev-test-cmpts2',
      phone: '+919000090003',
      username: 'cmpts2',
    });
    const post = await seedContent(author.id);
    const commenter = await seedUser({
      firebaseUid: 'dev-test-cmpts2b',
      phone: '+919000090004',
      username: 'cmpts2b',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-cmpts2b') },
      payload: { text: 'nice post 🔥' },
    });

    expect(res.statusCode).toBe(201);
    const ledger = await prisma.pointsLedger.findMany({
      where: { userId: commenter.id, actionType: 'comment' },
    });
    expect(ledger).toHaveLength(0);
  });

  it('counts whitespace-separated words after stripping emoji-only tokens', async () => {
    const app = getTestApp();
    const author = await seedUser({
      firebaseUid: 'dev-test-cmpts3',
      phone: '+919000090005',
      username: 'cmpts3',
    });
    const post = await seedContent(author.id);
    const commenter = await seedUser({
      firebaseUid: 'dev-test-cmpts3b',
      phone: '+919000090006',
      username: 'cmpts3b',
    });

    // 11 word tokens + inline emoji; should count as > 10 words.
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-cmpts3b') },
      payload: {
        text: 'Visited the bakery today and the black forest cake was amazing 🎂 — highly recommended.',
      },
    });
    expect(res.statusCode).toBe(201);
    const ledger = await prisma.pointsLedger.findMany({
      where: { userId: commenter.id, actionType: 'comment' },
    });
    expect(ledger).toHaveLength(1);
  });

  it('does NOT credit a second +3 when the same user re-posts a short comment after a long one', async () => {
    // A one-line comment should not erase the previous long-comment reward.
    const app = getTestApp();
    const author = await seedUser({
      firebaseUid: 'dev-test-cmpts4',
      phone: '+919000090007',
      username: 'cmpts4',
    });
    const post = await seedContent(author.id);
    const commenter = await seedUser({
      firebaseUid: 'dev-test-cmpts4b',
      phone: '+919000090008',
      username: 'cmpts4b',
    });

    // First comment (qualifying)
    await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-cmpts4b') },
      payload: { text: 'What a wonderful photo, I think this is one of the best I have seen all year.' },
    });
    // Second comment (short)
    await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-cmpts4b') },
      payload: { text: 'nice' },
    });

    const ledger = await prisma.pointsLedger.findMany({
      where: { userId: commenter.id, actionType: 'comment' },
    });
    expect(ledger).toHaveLength(1);
  });
});
