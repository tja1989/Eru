import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/utils/prisma.js';
import { getTestApp, closeTestApp } from '../helpers/setup.js';
import { seedUser, cleanupTestData, devToken } from '../helpers/db.js';

// ---------------------------------------------------------------------------
// Feed items must carry every field the mobile PostCard needs to render the
// 6 PWA variants (creator photo / creator video / sponsored / user-created +
// approved / poll / reel). Without these the client would have to re-derive
// them from scattered primitives, which is the exact drift we're preventing.
// ---------------------------------------------------------------------------
describe('GET /api/v1/feed — derived fields for PostCard variants', () => {
  beforeAll(() => {
    process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? 'https://example.invalid';
    process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? 'tok';
  });

  beforeEach(cleanupTestData);

  afterAll(async () => {
    await cleanupTestData();
    await closeTestApp();
  });

  it('every feed item exposes the PostCard variant shape', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd1',
      phone: '+912000060001',
      username: 'fd1',
    });
    // Mark as verified so we can assert 'creator' variant on this post.
    await prisma.user.update({ where: { id: u.id }, data: { isVerified: true } });
    await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'Creator post',
        moderationStatus: 'published',
        publishedAt: new Date(),
        locationPincode: '685613',
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd1') },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThan(0);

    // Assert every derived key is *present* on the item (may be null) —
    // expect.anything() rejects null/undefined so we check hasOwnProperty.
    for (const item of body.data) {
      for (const key of [
        'id',
        'ugcBadge',
        'moderationBadge',
        'isSponsored',
        'sponsorName',
        'sponsorAvatarUrl',
        'sponsorBusinessId',
        'offerUrl',
        'pointsEarnedOnView',
        'locationLabel',
        'mediaKind',
        'carouselCount',
        'durationSeconds',
      ]) {
        expect(Object.prototype.hasOwnProperty.call(item, key)).toBe(true);
      }
      expect(typeof item.isSponsored).toBe('boolean');
      expect(typeof item.pointsEarnedOnView).toBe('number');
      expect(typeof item.mediaKind).toBe('string');
    }
  });

  it('verified user post → ugcBadge=creator, moderationBadge=null', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd2',
      phone: '+912000060002',
      username: 'fd2',
    });
    await prisma.user.update({ where: { id: u.id }, data: { isVerified: true } });
    await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'Creator post',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd2') },
    });
    const item = res.json().data[0];
    expect(item.ugcBadge).toBe('creator');
    expect(item.moderationBadge).toBeNull();
  });

  it('non-verified user post (published) → ugcBadge=user_created, moderationBadge=approved', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd3',
      phone: '+912000060003',
      username: 'fd3',
    });
    await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'UGC approved post',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd3') },
    });
    const item = res.json().data[0];
    expect(item.ugcBadge).toBe('user_created');
    expect(item.moderationBadge).toBe('approved');
  });

  it('active sponsorship → isSponsored=true + sponsor fields from businessTag', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd4',
      phone: '+912000060004',
      username: 'fd4',
    });
    const biz = await prisma.business.create({
      data: {
        name: 'Kashi Bakes',
        category: 'bakery',
        pincode: '682016',
        avatarUrl: 'https://example.com/kashi.jpg',
      },
    });
    const content = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'Weekend Cake Fest',
        moderationStatus: 'published',
        publishedAt: new Date(),
        businessTagId: biz.id,
      },
    });
    await prisma.sponsorshipProposal.create({
      data: {
        businessId: biz.id,
        contentId: content.id,
        creatorId: u.id,
        boostAmount: '500',
        status: 'active',
        startsAt: new Date(Date.now() - 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd4') },
    });
    const item = res.json().data.find((i: { id: string }) => i.id === content.id);
    expect(item).toBeDefined();
    expect(item.isSponsored).toBe(true);
    expect(item.sponsorName).toBe('Kashi Bakes');
    expect(item.sponsorAvatarUrl).toBe('https://example.com/kashi.jpg');
    expect(item.sponsorBusinessId).toBe(biz.id);
    expect(item.offerUrl).toBe(`/business/${biz.id}`);
  });

  it('mediaKind: photo for image media; video for video media; reel for reel type; poll for poll type', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd5',
      phone: '+912000060005',
      username: 'fd5',
    });

    // Photo with image media
    const photo = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'Photo',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });
    await prisma.contentMedia.create({
      data: { contentId: photo.id, type: 'image', originalUrl: 'x', width: 1, height: 1, sortOrder: 0 },
    });

    // Video (type=post, but media=video)
    const video = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'Video',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });
    await prisma.contentMedia.create({
      data: { contentId: video.id, type: 'video', originalUrl: 'x', width: 1, height: 1, sortOrder: 0, durationSeconds: 272 },
    });

    // Reel
    const reel = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'reel',
        text: 'Reel',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });
    await prisma.contentMedia.create({
      data: { contentId: reel.id, type: 'video', originalUrl: 'x', width: 1, height: 1, sortOrder: 0, durationSeconds: 45 },
    });

    // Poll
    const poll = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'poll',
        text: 'Poll question?',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    // Carousel (3 images)
    const carousel = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'Carousel',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });
    await prisma.contentMedia.createMany({
      data: [
        { contentId: carousel.id, type: 'image', originalUrl: 'x', width: 1, height: 1, sortOrder: 0 },
        { contentId: carousel.id, type: 'image', originalUrl: 'x', width: 1, height: 1, sortOrder: 1 },
        { contentId: carousel.id, type: 'image', originalUrl: 'x', width: 1, height: 1, sortOrder: 2 },
      ],
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd5') },
    });
    const items = res.json().data as Array<{ id: string; mediaKind: string; durationSeconds: number | null; carouselCount: number | null }>;

    const byId = (id: string) => items.find((i) => i.id === id)!;
    expect(byId(photo.id).mediaKind).toBe('photo');
    expect(byId(video.id).mediaKind).toBe('video');
    expect(byId(video.id).durationSeconds).toBe(272);
    expect(byId(reel.id).mediaKind).toBe('reel');
    expect(byId(reel.id).durationSeconds).toBe(45);
    expect(byId(poll.id).mediaKind).toBe('poll');
    expect(byId(carousel.id).mediaKind).toBe('carousel');
    expect(byId(carousel.id).carouselCount).toBe(3);
  });

  it('locationLabel: "Area, District" when pincode resolves; null when no pincode', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd6',
      phone: '+912000060006',
      username: 'fd6',
    });
    const withPin = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'a',
        moderationStatus: 'published',
        publishedAt: new Date(),
        locationPincode: '682016',
      },
    });
    const noPin = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'b',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });

    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd6') },
    });
    const items = res.json().data as Array<{ id: string; locationLabel: string | null }>;
    // 682016 resolves to "Ernakulam Central, Ernakulam" via locationsService.
    expect(items.find((i) => i.id === withPin.id)!.locationLabel).toBe('Ernakulam Central, Ernakulam');
    expect(items.find((i) => i.id === noPin.id)!.locationLabel).toBeNull();
  });

  it('pointsEarnedOnView: from SUBTYPE_REACH_MULTIPLIER × base (or fallback 8)', async () => {
    const u = await seedUser({
      firebaseUid: 'dev-test-fd7',
      phone: '+912000060007',
      username: 'fd7',
    });
    const content = await prisma.content.create({
      data: {
        userId: u.id,
        type: 'post',
        text: 'plain',
        moderationStatus: 'published',
        publishedAt: new Date(),
      },
    });
    const res = await getTestApp().inject({
      method: 'GET',
      url: '/api/v1/feed?page=1',
      headers: { Authorization: devToken('dev-test-fd7') },
    });
    const item = res.json().data.find((i: { id: string }) => i.id === content.id);
    expect(item.pointsEarnedOnView).toBeGreaterThanOrEqual(1);
    expect(item.pointsEarnedOnView).toBeLessThanOrEqual(50);
  });
});
