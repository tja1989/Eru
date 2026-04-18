import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { exploreQuerySchema, searchQuerySchema, paginationSchema } from '../utils/validators.js';
import { Errors } from '../utils/errors.js';

export async function exploreRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // -------------------------------------------------------------------------
  // GET /explore — paginated content filtered by category, ordered by trending
  // -------------------------------------------------------------------------
  app.get('/explore', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = exploreQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { page, limit, category } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      moderationStatus: 'published',
      deletedAt: null,
    };

    // Filter by category via hashtags — if category is not 'all', use it as a hashtag filter
    if (category !== 'all') {
      where.hashtags = { has: category };
    }

    const content = await prisma.content.findMany({
      where,
      skip,
      take: limit,
      // Order by trending signals: views, likes, and recency combined
      orderBy: [
        { viewCount: 'desc' },
        { likeCount: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        media: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
            tier: true,
          },
        },
      },
    });

    const total = await prisma.content.count({ where });

    // Normalise to the standard PaginatedResponse shape {data, nextPage, total}
    return {
      data: content,
      nextPage: page * limit < total ? page + 1 : null,
      total,
    };
  });

  // -------------------------------------------------------------------------
  // GET /search — search users, posts, and hashtags
  // -------------------------------------------------------------------------
  app.get('/search', async (request) => {
    const rawQuery = request.query as Record<string, string>;

    const parsed = searchQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { q } = parsed.data;

    // Run all three searches concurrently for performance
    const [users, posts, hashtagContent] = await Promise.all([
      // Search users by name or username (case-insensitive)
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          isVerified: true,
          tier: true,
          bio: true,
        },
      }),

      // Search posts by text content (case-insensitive)
      prisma.content.findMany({
        where: {
          moderationStatus: 'published',
          deletedAt: null,
          text: { contains: q, mode: 'insensitive' },
        },
        take: 10,
        orderBy: { likeCount: 'desc' },
        include: {
          media: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      }),

      // Search for content that uses the query as a hashtag
      prisma.content.findMany({
        where: {
          moderationStatus: 'published',
          deletedAt: null,
          hashtags: { has: q.toLowerCase().replace(/^#/, '') },
        },
        take: 10,
        orderBy: { likeCount: 'desc' },
        select: { hashtags: true },
      }),
    ]);

    // Extract unique hashtags from the hashtag search results
    const hashtagSet = new Set<string>();
    for (const item of hashtagContent) {
      for (const tag of item.hashtags) {
        if (tag.toLowerCase().includes(q.toLowerCase().replace(/^#/, ''))) {
          hashtagSet.add(tag);
        }
      }
    }
    const hashtags = Array.from(hashtagSet).slice(0, 10);

    return { users, posts, hashtags };
  });

  // -------------------------------------------------------------------------
  // GET /trending — top 20 hashtags from last 48h + trending content
  // -------------------------------------------------------------------------
  app.get('/trending', async (request) => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Fetch recently published content to extract trending hashtags
    const recentContent = await prisma.content.findMany({
      where: {
        moderationStatus: 'published',
        deletedAt: null,
        publishedAt: { gte: twoDaysAgo },
      },
      select: {
        hashtags: true,
        likeCount: true,
        viewCount: true,
      },
      take: 500, // Sample last 500 published posts for hashtag frequency
    });

    // Count hashtag frequency across recent content
    const hashtagFrequency = new Map<string, number>();
    for (const item of recentContent) {
      for (const tag of item.hashtags) {
        hashtagFrequency.set(tag, (hashtagFrequency.get(tag) ?? 0) + 1);
      }
    }

    // Sort by frequency and take top 20
    const trendingHashtags = Array.from(hashtagFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    // Fetch top trending content from last 48h
    const trendingContent = await prisma.content.findMany({
      where: {
        moderationStatus: 'published',
        deletedAt: null,
        publishedAt: { gte: twoDaysAgo },
      },
      take: 20,
      orderBy: [
        { viewCount: 'desc' },
        { likeCount: 'desc' },
      ],
      include: {
        media: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
            tier: true,
          },
        },
      },
    });

    return { trendingHashtags, trendingContent };
  });
}
