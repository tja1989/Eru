import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Poll endpoints', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => { await cleanupTestData(); await closeTestApp(); });

  // ── Content creation ────────────────────────────────────────────────────────

  describe('POST /api/v1/content/create — poll type', () => {
    it('creating a poll content persists its options', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll1a', phone: '+919100000001', username: 'tpoll1a' });
      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll1a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'poll',
          text: 'Which do you prefer?',
          pollOptions: ['Option A', 'Option B', 'Option C'],
        }),
      });
      expect(res.statusCode).toBe(201);
      const { content } = res.json();
      expect(content).toBeDefined();
      const options = await prisma.pollOption.findMany({
        where: { contentId: content.id },
        orderBy: { sortOrder: 'asc' },
      });
      expect(options).toHaveLength(3);
      expect(options[0].text).toBe('Option A');
      expect(options[0].sortOrder).toBe(0);
      expect(options[0].voteCount).toBe(0);
      expect(options[1].text).toBe('Option B');
      expect(options[1].sortOrder).toBe(1);
      expect(options[2].text).toBe('Option C');
      expect(options[2].sortOrder).toBe(2);
    });

    it('creating a poll with <2 options returns 400', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll2a', phone: '+919100000002', username: 'tpoll2a' });
      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll2a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'poll',
          text: 'Just one option?',
          pollOptions: ['Only One'],
        }),
      });
      expect(res.statusCode).toBe(400);
    });

    it('creating a poll with >4 options returns 400', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll3a', phone: '+919100000003', username: 'tpoll3a' });
      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll3a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'poll',
          text: 'Too many options',
          pollOptions: ['A', 'B', 'C', 'D', 'E'],
        }),
      });
      expect(res.statusCode).toBe(400);
    });

    it('providing pollOptions on a non-poll type returns 400', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll4a', phone: '+919100000004', username: 'tpoll4a' });
      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll4a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'post',
          text: 'Just a post',
          pollOptions: ['A', 'B'],
        }),
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── Voting ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/polls/:contentId/vote', () => {
    it('voting on a poll increments voteCount and creates a PollVote', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll5a', phone: '+919100000005', username: 'tpoll5a' });
      // Create the poll content via API so options are persisted
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll5a'), 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'poll',
          text: 'Pick one',
          pollOptions: ['Yes', 'No'],
        }),
      });
      expect(createRes.statusCode).toBe(201);
      const { content } = createRes.json();
      const options = await prisma.pollOption.findMany({
        where: { contentId: content.id },
        orderBy: { sortOrder: 'asc' },
      });
      const optionToVote = options[0];

      const voteRes = await getTestApp().inject({
        method: 'POST', url: `/api/v1/polls/${content.id}/vote`,
        headers: { Authorization: devToken('dev-test-poll5a'), 'content-type': 'application/json' },
        body: JSON.stringify({ pollOptionId: optionToVote.id }),
      });
      expect(voteRes.statusCode).toBe(201);
      const body = voteRes.json();
      expect(body.success).toBe(true);
      expect(body.pollOptionId).toBe(optionToVote.id);
      expect(body.totalVotes).toBe(1);

      const updated = await prisma.pollOption.findUnique({ where: { id: optionToVote.id } });
      expect(updated?.voteCount).toBe(1);

      const vote = await prisma.pollVote.findFirst({ where: { userId: u.id, pollOptionId: optionToVote.id } });
      expect(vote).not.toBeNull();
    });

    it('voting a second time on the same option is idempotent (200, voteCount stays 1)', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll6a', phone: '+919100000006', username: 'tpoll6a' });
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll6a'), 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'poll', text: 'Idempotent?', pollOptions: ['Yes', 'No'] }),
      });
      const { content } = createRes.json();
      const options = await prisma.pollOption.findMany({ where: { contentId: content.id }, orderBy: { sortOrder: 'asc' } });
      const optId = options[0].id;

      // First vote
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/polls/${content.id}/vote`,
        headers: { Authorization: devToken('dev-test-poll6a'), 'content-type': 'application/json' },
        body: JSON.stringify({ pollOptionId: optId }),
      });

      // Second vote — same option
      const res2 = await getTestApp().inject({
        method: 'POST', url: `/api/v1/polls/${content.id}/vote`,
        headers: { Authorization: devToken('dev-test-poll6a'), 'content-type': 'application/json' },
        body: JSON.stringify({ pollOptionId: optId }),
      });
      expect(res2.statusCode).toBe(200);
      const updated = await prisma.pollOption.findUnique({ where: { id: optId } });
      expect(updated?.voteCount).toBe(1);
    });

    it('voting a different option reassigns the vote (old option voteCount-1, new option voteCount+1)', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll7a', phone: '+919100000007', username: 'tpoll7a' });
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll7a'), 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'poll', text: 'Change vote?', pollOptions: ['First', 'Second'] }),
      });
      const { content } = createRes.json();
      const options = await prisma.pollOption.findMany({ where: { contentId: content.id }, orderBy: { sortOrder: 'asc' } });
      const firstOpt = options[0];
      const secondOpt = options[1];

      // Vote for first option
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/polls/${content.id}/vote`,
        headers: { Authorization: devToken('dev-test-poll7a'), 'content-type': 'application/json' },
        body: JSON.stringify({ pollOptionId: firstOpt.id }),
      });

      // Reassign to second option
      const reassignRes = await getTestApp().inject({
        method: 'POST', url: `/api/v1/polls/${content.id}/vote`,
        headers: { Authorization: devToken('dev-test-poll7a'), 'content-type': 'application/json' },
        body: JSON.stringify({ pollOptionId: secondOpt.id }),
      });
      expect(reassignRes.statusCode).toBe(201);
      const body = reassignRes.json();
      expect(body.pollOptionId).toBe(secondOpt.id);
      expect(body.totalVotes).toBe(1);

      const updatedFirst = await prisma.pollOption.findUnique({ where: { id: firstOpt.id } });
      const updatedSecond = await prisma.pollOption.findUnique({ where: { id: secondOpt.id } });
      expect(updatedFirst?.voteCount).toBe(0);
      expect(updatedSecond?.voteCount).toBe(1);
    });

    it('voting on a content whose type is not poll returns 400', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll8a', phone: '+919100000008', username: 'tpoll8a' });
      const nonPollContent = await seedContent(u.id, { type: 'post' });

      const res = await getTestApp().inject({
        method: 'POST', url: `/api/v1/polls/${nonPollContent.id}/vote`,
        headers: { Authorization: devToken('dev-test-poll8a'), 'content-type': 'application/json' },
        body: JSON.stringify({ pollOptionId: 'some-fake-id' }),
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── GET content/:id with pollOptions ────────────────────────────────────────

  describe('GET /api/v1/content/:id — pollOptions for poll type', () => {
    it('returns pollOptions sorted by sortOrder when content.type is poll', async () => {
      const u = await seedUser({ firebaseUid: 'dev-test-poll9a', phone: '+919100000009', username: 'tpoll9a' });
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/content/create',
        headers: { Authorization: devToken('dev-test-poll9a'), 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'poll', text: 'Fave color?', pollOptions: ['Red', 'Blue', 'Green'] }),
      });
      const { content: created } = createRes.json();

      // Publish the content so it's visible
      await prisma.content.update({ where: { id: created.id }, data: { moderationStatus: 'published', publishedAt: new Date() } });

      const getRes = await getTestApp().inject({
        method: 'GET', url: `/api/v1/content/${created.id}`,
        headers: { Authorization: devToken('dev-test-poll9a') },
      });
      expect(getRes.statusCode).toBe(200);
      const body = getRes.json();
      expect(body.content.pollOptions).toBeDefined();
      expect(body.content.pollOptions).toHaveLength(3);
      expect(body.content.pollOptions[0].text).toBe('Red');
      expect(body.content.pollOptions[0].sortOrder).toBe(0);
      expect(body.content.pollOptions[1].text).toBe('Blue');
      expect(body.content.pollOptions[2].text).toBe('Green');
      // userVote should be null when user hasn't voted
      expect(body.content.userVote).toBeNull();
    });
  });
});
