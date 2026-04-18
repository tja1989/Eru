import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { seedUser, cleanupTestData } from '../helpers/db.js';
import { prisma } from '../../src/utils/prisma.js';
import { messagesService } from '../../src/services/messagesService.js';

describe('messagesService', () => {
  beforeEach(async () => {
    await cleanupTestData();
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  it('getOrCreateConversation creates a new conversation for two users', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m1a', phone: '+911200000001', username: 'tm1a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m1b', phone: '+911200000002', username: 'tm1b' });
    const conv = await messagesService.getOrCreateConversation(a.id, b.id);
    expect(conv.userAId === a.id || conv.userAId === b.id).toBe(true);
  });

  it('getOrCreateConversation returns the existing conversation (regardless of user order)', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m2a', phone: '+911200000003', username: 'tm2a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m2b', phone: '+911200000004', username: 'tm2b' });
    const c1 = await messagesService.getOrCreateConversation(a.id, b.id);
    const c2 = await messagesService.getOrCreateConversation(b.id, a.id);
    expect(c1.id).toBe(c2.id);
  });

  it('sendMessage inserts a message and updates lastMessageAt', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m3a', phone: '+911200000005', username: 'tm3a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m3b', phone: '+911200000006', username: 'tm3b' });
    const conv = await messagesService.getOrCreateConversation(a.id, b.id);
    const msg = await messagesService.sendMessage(conv.id, a.id, 'Hello');
    expect(msg.text).toBe('Hello');
    const updated = await prisma.conversation.findUnique({ where: { id: conv.id } });
    expect(updated?.lastMessageAt).not.toBeNull();
  });

  it('listConversations returns the users conversations newest first', async () => {
    const a = await seedUser({ firebaseUid: 'dev-test-m4a', phone: '+911200000007', username: 'tm4a' });
    const b = await seedUser({ firebaseUid: 'dev-test-m4b', phone: '+911200000008', username: 'tm4b' });
    const c = await seedUser({ firebaseUid: 'dev-test-m4c', phone: '+911200000009', username: 'tm4c' });
    const conv1 = await messagesService.getOrCreateConversation(a.id, b.id);
    await messagesService.sendMessage(conv1.id, a.id, 'hi');
    await new Promise((r) => setTimeout(r, 20));
    const conv2 = await messagesService.getOrCreateConversation(a.id, c.id);
    await messagesService.sendMessage(conv2.id, a.id, 'yo');

    const list = await messagesService.listConversations(a.id);
    expect(list[0].id).toBe(conv2.id);
    expect(list[1].id).toBe(conv1.id);
  });
});
