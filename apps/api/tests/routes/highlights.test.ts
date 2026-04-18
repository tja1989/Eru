import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, seedContent, cleanupTestData, devToken } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';

describe('Highlight endpoints', () => {
  beforeEach(cleanupTestData);
  afterAll(async () => { await cleanupTestData(); await closeTestApp(); });

  // ── GET /users/:id/highlights ────────────────────────────────────────────────

  describe('GET /api/v1/users/:id/highlights', () => {
    it('returns public highlight list with itemCount', async () => {
      const owner = await seedUser({ firebaseUid: 'dev-test-hl1a', phone: '+919200000001', username: 'thl1a' });
      const viewer = await seedUser({ firebaseUid: 'dev-test-hl1b', phone: '+919200000002', username: 'thl1b' });

      // Create a highlight and attach one content item
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl1a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'My Best Posts', emoji: '⭐', sortOrder: 0 }),
      });
      expect(createRes.statusCode).toBe(201);
      const { highlight } = createRes.json();

      const content = await seedContent(owner.id);
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl1a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      });

      // Viewer (different user) can see the list
      const res = await getTestApp().inject({
        method: 'GET', url: `/api/v1/users/${owner.id}/highlights`,
        headers: { Authorization: devToken('dev-test-hl1b') },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.highlights).toHaveLength(1);
      expect(body.highlights[0].title).toBe('My Best Posts');
      expect(body.highlights[0].emoji).toBe('⭐');
      expect(body.highlights[0].itemCount).toBe(1);
    });

    it('returns empty array when user has no highlights', async () => {
      const user = await seedUser({ firebaseUid: 'dev-test-hl2a', phone: '+919200000010', username: 'thl2a' });
      const res = await getTestApp().inject({
        method: 'GET', url: `/api/v1/users/${user.id}/highlights`,
        headers: { Authorization: devToken('dev-test-hl2a') },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().highlights).toHaveLength(0);
    });
  });

  // ── POST /highlights ─────────────────────────────────────────────────────────

  describe('POST /api/v1/highlights', () => {
    it('creates a highlight owned by the current user', async () => {
      const user = await seedUser({ firebaseUid: 'dev-test-hl3a', phone: '+919200000020', username: 'thl3a' });

      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl3a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Travel', emoji: '✈️' }),
      });
      expect(res.statusCode).toBe(201);
      const { highlight } = res.json();
      expect(highlight.title).toBe('Travel');
      expect(highlight.emoji).toBe('✈️');
      expect(highlight.sortOrder).toBe(0);

      // Verify it's in the DB linked to the right user
      const dbRow = await prisma.highlight.findUnique({ where: { id: highlight.id } });
      expect(dbRow).not.toBeNull();
      expect(dbRow?.userId).toBe(user.id);
    });

    it('returns 400 if title is empty', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl4a', phone: '+919200000030', username: 'thl4a' });
      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl4a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: '', emoji: '⭐' }),
      });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 if title exceeds 40 chars', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl5a', phone: '+919200000040', username: 'thl5a' });
      const res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl5a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'A'.repeat(41), emoji: '⭐' }),
      });
      expect(res.statusCode).toBe(400);
    });
  });

  // ── PUT /highlights/:id ──────────────────────────────────────────────────────

  describe('PUT /api/v1/highlights/:id', () => {
    it('owner can update title, emoji, and sortOrder', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl6a', phone: '+919200000050', username: 'thl6a' });
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl6a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Old Title', emoji: '🌟', sortOrder: 0 }),
      });
      const { highlight } = createRes.json();

      const updateRes = await getTestApp().inject({
        method: 'PUT', url: `/api/v1/highlights/${highlight.id}`,
        headers: { Authorization: devToken('dev-test-hl6a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'New Title', sortOrder: 5 }),
      });
      expect(updateRes.statusCode).toBe(200);
      const updated = updateRes.json().highlight;
      expect(updated.title).toBe('New Title');
      expect(updated.sortOrder).toBe(5);
      expect(updated.emoji).toBe('🌟'); // unchanged
    });

    it('returns 403 when non-owner tries to update', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl7a', phone: '+919200000060', username: 'thl7a' });
      await seedUser({ firebaseUid: 'dev-test-hl7b', phone: '+919200000061', username: 'thl7b' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl7a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Owners Only', emoji: '🔒' }),
      });
      const { highlight } = createRes.json();

      const res = await getTestApp().inject({
        method: 'PUT', url: `/api/v1/highlights/${highlight.id}`,
        headers: { Authorization: devToken('dev-test-hl7b'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Hacked' }),
      });
      expect(res.statusCode).toBe(403);
    });

    it('returns 404 for a non-existent highlight', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl8a', phone: '+919200000070', username: 'thl8a' });
      const res = await getTestApp().inject({
        method: 'PUT', url: '/api/v1/highlights/00000000-0000-0000-0000-000000000000',
        headers: { Authorization: devToken('dev-test-hl8a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Ghost' }),
      });
      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /highlights/:id ───────────────────────────────────────────────────

  describe('DELETE /api/v1/highlights/:id', () => {
    it('owner can delete a highlight and items are cascade-deleted', async () => {
      const owner = await seedUser({ firebaseUid: 'dev-test-hl9a', phone: '+919200000080', username: 'thl9a' });
      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl9a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'To Delete', emoji: '🗑️' }),
      });
      const { highlight } = createRes.json();

      // Add an item
      const content = await seedContent(owner.id);
      await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl9a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      });

      const items = await prisma.highlightItem.findMany({ where: { highlightId: highlight.id } });
      expect(items).toHaveLength(1);

      // Delete the highlight
      const delRes = await getTestApp().inject({
        method: 'DELETE', url: `/api/v1/highlights/${highlight.id}`,
        headers: { Authorization: devToken('dev-test-hl9a') },
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().success).toBe(true);

      // Highlight and its item should be gone
      const dbRow = await prisma.highlight.findUnique({ where: { id: highlight.id } });
      expect(dbRow).toBeNull();
      const orphanItems = await prisma.highlightItem.findMany({ where: { highlightId: highlight.id } });
      expect(orphanItems).toHaveLength(0);
    });

    it('returns 403 when non-owner tries to delete', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl10a', phone: '+919200000090', username: 'thl10a' });
      await seedUser({ firebaseUid: 'dev-test-hl10b', phone: '+919200000091', username: 'thl10b' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl10a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Protected', emoji: '🛡️' }),
      });
      const { highlight } = createRes.json();

      const res = await getTestApp().inject({
        method: 'DELETE', url: `/api/v1/highlights/${highlight.id}`,
        headers: { Authorization: devToken('dev-test-hl10b') },
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── POST /highlights/:id/items ───────────────────────────────────────────────

  describe('POST /api/v1/highlights/:id/items', () => {
    it('rejects adding another user\'s content (400)', async () => {
      const owner = await seedUser({ firebaseUid: 'dev-test-hl11a', phone: '+919200000100', username: 'thl11a' });
      const other = await seedUser({ firebaseUid: 'dev-test-hl11b', phone: '+919200000101', username: 'thl11b' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl11a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'My Highlight', emoji: '💎' }),
      });
      const { highlight } = createRes.json();

      // Content owned by OTHER user
      const otherContent = await seedContent(other.id);

      const res = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl11a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: otherContent.id }),
      });
      expect(res.statusCode).toBe(400);
    });

    it('sortOrder increments correctly across multiple items', async () => {
      const owner = await seedUser({ firebaseUid: 'dev-test-hl12a', phone: '+919200000110', username: 'thl12a' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl12a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Sort Test', emoji: '📊' }),
      });
      const { highlight } = createRes.json();

      const c1 = await seedContent(owner.id);
      const c2 = await seedContent(owner.id);
      const c3 = await seedContent(owner.id);

      const r1 = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl12a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: c1.id }),
      });
      expect(r1.statusCode).toBe(201);
      expect(r1.json().item.sortOrder).toBe(0);

      const r2 = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl12a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: c2.id }),
      });
      expect(r2.statusCode).toBe(201);
      expect(r2.json().item.sortOrder).toBe(1);

      const r3 = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl12a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: c3.id }),
      });
      expect(r3.statusCode).toBe(201);
      expect(r3.json().item.sortOrder).toBe(2);
    });

    it('returns 403 when non-owner tries to add an item', async () => {
      await seedUser({ firebaseUid: 'dev-test-hl13a', phone: '+919200000120', username: 'thl13a' });
      const other = await seedUser({ firebaseUid: 'dev-test-hl13b', phone: '+919200000121', username: 'thl13b' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl13a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Protected Items', emoji: '🔐' }),
      });
      const { highlight } = createRes.json();
      const otherContent = await seedContent(other.id);

      const res = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl13b'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: otherContent.id }),
      });
      expect(res.statusCode).toBe(403);
    });
  });

  // ── DELETE /highlights/:id/items/:itemId ─────────────────────────────────────

  describe('DELETE /api/v1/highlights/:id/items/:itemId', () => {
    it('owner can remove an item from a highlight', async () => {
      const owner = await seedUser({ firebaseUid: 'dev-test-hl14a', phone: '+919200000130', username: 'thl14a' });

      const createRes = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl14a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Item Removal', emoji: '✂️' }),
      });
      const { highlight } = createRes.json();

      const content = await seedContent(owner.id);
      const addRes = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${highlight.id}/items`,
        headers: { Authorization: devToken('dev-test-hl14a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      });
      expect(addRes.statusCode).toBe(201);
      const { item } = addRes.json();

      const delRes = await getTestApp().inject({
        method: 'DELETE', url: `/api/v1/highlights/${highlight.id}/items/${item.id}`,
        headers: { Authorization: devToken('dev-test-hl14a') },
      });
      expect(delRes.statusCode).toBe(200);
      expect(delRes.json().success).toBe(true);

      const dbItem = await prisma.highlightItem.findUnique({ where: { id: item.id } });
      expect(dbItem).toBeNull();
    });

    it('returns 404 when item does not belong to the given highlight', async () => {
      const owner = await seedUser({ firebaseUid: 'dev-test-hl15a', phone: '+919200000140', username: 'thl15a' });

      const h1Res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl15a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Highlight One', emoji: '1️⃣' }),
      });
      const h2Res = await getTestApp().inject({
        method: 'POST', url: '/api/v1/highlights',
        headers: { Authorization: devToken('dev-test-hl15a'), 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'Highlight Two', emoji: '2️⃣' }),
      });
      const h1 = h1Res.json().highlight;
      const h2 = h2Res.json().highlight;

      const content = await seedContent(owner.id);
      const addRes = await getTestApp().inject({
        method: 'POST', url: `/api/v1/highlights/${h1.id}/items`,
        headers: { Authorization: devToken('dev-test-hl15a'), 'content-type': 'application/json' },
        body: JSON.stringify({ contentId: content.id }),
      });
      const { item } = addRes.json();

      // Try to delete the item using h2's ID — should 404
      const delRes = await getTestApp().inject({
        method: 'DELETE', url: `/api/v1/highlights/${h2.id}/items/${item.id}`,
        headers: { Authorization: devToken('dev-test-hl15a') },
      });
      expect(delRes.statusCode).toBe(404);
    });
  });
});
