import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';

describe('POST /api/v1/posts/:id/comments', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('creates a comment and returns 201 with the comment + user', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter',
      phone: '+919000000001',
      username: 'tcommenter',
    });
    const post = await seedContent(user.id, { text: 'A post to comment on' });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter') },
      payload: { text: 'This is my first comment, hooray' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.comment.text).toBe('This is my first comment, hooray');
    expect(body.comment.user.username).toBe('tcommenter');
    expect(body.comment.parentId).toBeNull();
  });

  it('increments the parent content commentCount', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter2',
      phone: '+919000000002',
      username: 'tcommenter2',
    });
    const post = await seedContent(user.id);

    await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter2') },
      payload: { text: 'Incrementing the counter' },
    });

    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/content/${post.id}`,
      headers: { Authorization: devToken('dev-test-commenter2') },
    });
    expect(detail.json().content.commentCount).toBe(1);
  });

  it('rejects empty text with 400', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter3',
      phone: '+919000000003',
      username: 'tcommenter3',
    });
    const post = await seedContent(user.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter3') },
      payload: { text: '' },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter4',
      phone: '+919000000004',
      username: 'tcommenter4',
    });
    const post = await seedContent(user.id);

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      payload: { text: 'hi' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('creates threaded replies when parentId is provided', async () => {
    const app = getTestApp();
    const user = await seedUser({
      firebaseUid: 'dev-test-commenter5',
      phone: '+919000000005',
      username: 'tcommenter5',
    });
    const post = await seedContent(user.id);

    const parentRes = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter5') },
      payload: { text: 'Parent comment' },
    });
    const parentId = parentRes.json().comment.id;

    const replyRes = await app.inject({
      method: 'POST',
      url: `/api/v1/posts/${post.id}/comments`,
      headers: { Authorization: devToken('dev-test-commenter5') },
      payload: { text: 'Reply to parent', parentId },
    });

    expect(replyRes.statusCode).toBe(201);
    expect(replyRes.json().comment.parentId).toBe(parentId);
  });
});
