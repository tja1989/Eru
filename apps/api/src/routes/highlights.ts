import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

const createHighlightSchema = z.object({
  title: z.string().min(1).max(40),
  emoji: z.string().min(1).max(8),
  sortOrder: z.number().int().optional(),
});

const updateHighlightSchema = z.object({
  title: z.string().min(1).max(40).optional(),
  emoji: z.string().min(1).max(8).optional(),
  sortOrder: z.number().int().optional(),
});

const addItemSchema = z.object({
  contentId: z.string().uuid(),
});

const MAX_HIGHLIGHTS_PER_USER = 20;

export async function highlightRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook('preHandler', authMiddleware);

  // GET /users/:id/highlights — public list of a user's highlights with item counts
  app.get('/users/:id/highlights', async (request, reply) => {
    const { id } = request.params as { id: string };

    const highlights = await prisma.highlight.findMany({
      where: { userId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { items: true } } },
    });

    return reply.status(200).send({
      highlights: highlights.map((h) => ({
        id: h.id,
        title: h.title,
        emoji: h.emoji,
        sortOrder: h.sortOrder,
        createdAt: h.createdAt,
        itemCount: h._count.items,
      })),
    });
  });

  // POST /highlights — create a new highlight for the current user
  app.post('/highlights', async (request, reply) => {
    const currentUserId = request.userId;

    const existingCount = await prisma.highlight.count({ where: { userId: currentUserId } });
    if (existingCount >= MAX_HIGHLIGHTS_PER_USER) {
      throw Errors.badRequest('Maximum of 20 highlights per user');
    }

    const parsed = createHighlightSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }
    const { title, emoji, sortOrder } = parsed.data;

    const highlight = await prisma.highlight.create({
      data: {
        userId: currentUserId,
        title,
        emoji,
        sortOrder: sortOrder ?? 0,
      },
    });

    return reply.status(201).send({ highlight });
  });

  // PUT /highlights/:id — update a highlight (owner only)
  app.put('/highlights/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.userId;

    const existing = await prisma.highlight.findUnique({ where: { id } });
    if (!existing) throw Errors.notFound('Highlight');
    if (existing.userId !== currentUserId) throw Errors.forbidden('Not the owner');

    const parsed = updateHighlightSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const updated = await prisma.highlight.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.emoji !== undefined && { emoji: parsed.data.emoji }),
        ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
      },
    });

    return reply.status(200).send({ highlight: updated });
  });

  // DELETE /highlights/:id — delete a highlight (cascades to items, owner only)
  app.delete('/highlights/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.userId;

    const existing = await prisma.highlight.findUnique({ where: { id } });
    if (!existing) throw Errors.notFound('Highlight');
    if (existing.userId !== currentUserId) throw Errors.forbidden('Not the owner');

    await prisma.highlight.delete({ where: { id } });

    return reply.status(200).send({ success: true });
  });

  // POST /highlights/:id/items — add a content item to a highlight (owner only, own content only)
  app.post('/highlights/:id/items', async (request, reply) => {
    const { id } = request.params as { id: string };
    const currentUserId = request.userId;

    const highlight = await prisma.highlight.findUnique({ where: { id } });
    if (!highlight) throw Errors.notFound('Highlight');
    if (highlight.userId !== currentUserId) throw Errors.forbidden('Not the owner');

    const parsed = addItemSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }
    const { contentId } = parsed.data;

    // Content must exist and belong to the same user
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');
    if (content.userId !== currentUserId) {
      throw Errors.badRequest('You can only highlight your own content');
    }

    // Reject duplicate content in the same highlight
    const existing = await prisma.highlightItem.findFirst({
      where: { highlightId: id, contentId },
    });
    if (existing) throw Errors.badRequest('Content is already in this highlight');

    // sortOrder = max existing sortOrder + 1 (or 0 if no items yet)
    const maxItem = await prisma.highlightItem.findFirst({
      where: { highlightId: id },
      orderBy: { sortOrder: 'desc' },
    });
    const nextSortOrder = maxItem ? maxItem.sortOrder + 1 : 0;

    const item = await prisma.highlightItem.create({
      data: {
        highlightId: id,
        contentId,
        sortOrder: nextSortOrder,
      },
    });

    return reply.status(201).send({ item });
  });

  // GET /highlights/:id — public single highlight with items + content inline
  app.get('/highlights/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const highlight = await prisma.highlight.findUnique({
      where: { id },
      include: {
        items: {
          include: { content: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!highlight) throw Errors.notFound('Highlight');

    return reply.status(200).send({ highlight });
  });

  // DELETE /highlights/:id/items/:itemId — remove an item from a highlight (owner only)
  app.delete('/highlights/:id/items/:itemId', async (request, reply) => {
    const { id, itemId } = request.params as { id: string; itemId: string };
    const currentUserId = request.userId;

    const item = await prisma.highlightItem.findUnique({
      where: { id: itemId },
      include: { highlight: true },
    });

    if (!item || item.highlightId !== id) throw Errors.notFound('HighlightItem');
    if (item.highlight.userId !== currentUserId) throw Errors.forbidden('Not the owner');

    await prisma.highlightItem.delete({ where: { id: itemId } });

    return reply.status(200).send({ success: true });
  });
}
