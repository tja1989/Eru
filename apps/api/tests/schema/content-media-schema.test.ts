import { describe, it, expect, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { seedUser, seedContent, cleanupTestData } from '../helpers/db.js';

describe('ContentMedia schema supports HLS and extended ladder', () => {
  beforeEach(async () => { await cleanupTestData(); });
  afterAll(async () => { await cleanupTestData(); });

  it('accepts hlsManifestUrl + video540pUrl + video240pUrl', async () => {
    const u = await seedUser({ firebaseUid: 'dev-test-schema1', phone: '+912500000001', username: 'tschema1' });
    const content = await seedContent(u.id, { type: 'reel' });
    const media = await prisma.contentMedia.create({
      data: {
        contentId: content.id,
        type: 'video',
        originalUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/originals/dev-test-s1.mov',
        width: 1080,
        height: 1920,
        hlsManifestUrl: 'https://cdn/master.m3u8',
        video240pUrl: 'https://cdn/240p.m3u8',
        video540pUrl: 'https://cdn/540p.m3u8',
      },
    });
    expect(media.hlsManifestUrl).toBe('https://cdn/master.m3u8');
    expect(media.video240pUrl).toBe('https://cdn/240p.m3u8');
    expect(media.video540pUrl).toBe('https://cdn/540p.m3u8');
  });
});
