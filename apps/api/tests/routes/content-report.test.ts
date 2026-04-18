import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('POST /api/v1/content/:id/report', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('creates a ContentReport row and returns 201', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp1a', phone: '+911700000001', username: 'trp1a' });
    const reporter = await seedUser({ firebaseUid: 'dev-test-rp1b', phone: '+911700000002', username: 'trp1b' });
    const content = await seedContent(author.id);

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp1b') },
      payload: { reason: 'spam', notes: 'repeated promo' },
    });

    expect(res.statusCode).toBe(201);
    const count = await prisma.contentReport.count({
      where: { contentId: content.id, reporterId: reporter.id },
    });
    expect(count).toBe(1);
  });

  it('rejects duplicate reports from the same user with 409', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp2a', phone: '+911700000003', username: 'trp2a' });
    await seedUser({ firebaseUid: 'dev-test-rp2b', phone: '+911700000004', username: 'trp2b' });
    const content = await seedContent(author.id);

    await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp2b') },
      payload: { reason: 'spam' },
    });
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp2b') },
      payload: { reason: 'harassment' },
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 400 on invalid reason', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp3a', phone: '+911700000005', username: 'trp3a' });
    await seedUser({ firebaseUid: 'dev-test-rp3b', phone: '+911700000006', username: 'trp3b' });
    const content = await seedContent(author.id);

    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      headers: { Authorization: devToken('dev-test-rp3b') },
      payload: { reason: 'invalid-reason' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 for unknown content', async () => {
    await seedUser({ firebaseUid: 'dev-test-rp4', phone: '+911700000007', username: 'trp4' });
    const res = await getTestApp().inject({
      method: 'POST',
      url: '/api/v1/content/00000000-0000-0000-0000-000000000000/report',
      headers: { Authorization: devToken('dev-test-rp4') },
      payload: { reason: 'spam' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const author = await seedUser({ firebaseUid: 'dev-test-rp5', phone: '+911700000008', username: 'trp5' });
    const content = await seedContent(author.id);
    const res = await getTestApp().inject({
      method: 'POST',
      url: `/api/v1/content/${content.id}/report`,
      payload: { reason: 'spam' },
    });
    expect(res.statusCode).toBe(401);
  });
});
