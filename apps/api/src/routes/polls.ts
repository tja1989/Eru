import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { Errors } from '../utils/errors.js';

const voteSchema = z.object({
  pollOptionId: z.string().uuid(),
});

export async function pollRoutes(app: FastifyInstance) {
  // All routes in this plugin require authentication
  app.addHook('preHandler', authMiddleware);

  // POST /polls/:contentId/vote — cast or reassign a vote on a poll
  app.post('/polls/:contentId/vote', async (request, reply) => {
    const { contentId } = request.params as { contentId: string };
    const currentUserId = request.userId;

    const parsed = voteSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }
    const { pollOptionId } = parsed.data;

    // Verify the content exists and is a poll
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw Errors.notFound('Content');
    if (content.type !== 'poll') throw Errors.badRequest('Content is not a poll');

    // Verify the chosen option belongs to this poll
    const targetOption = await prisma.pollOption.findUnique({ where: { id: pollOptionId } });
    if (!targetOption || targetOption.contentId !== contentId) {
      throw Errors.badRequest('Poll option does not belong to this poll');
    }

    // Check for an existing vote on any option of this poll
    const existingVote = await prisma.pollVote.findFirst({
      where: {
        userId: currentUserId,
        pollOption: { contentId },
      },
    });

    if (existingVote) {
      // Same option — idempotent: return current state with no mutation
      if (existingVote.pollOptionId === pollOptionId) {
        const totalVotes = await prisma.pollOption.aggregate({
          where: { contentId },
          _sum: { voteCount: true },
        });
        return reply.status(200).send({
          success: true,
          pollOptionId,
          totalVotes: totalVotes._sum.voteCount ?? 0,
        });
      }

      // Different option — reassign: delete old vote + decrement, create new vote + increment
      await prisma.$transaction([
        prisma.pollVote.delete({ where: { id: existingVote.id } }),
        prisma.pollOption.update({
          where: { id: existingVote.pollOptionId },
          data: { voteCount: { decrement: 1 } },
        }),
        prisma.pollVote.create({
          data: { userId: currentUserId, pollOptionId },
        }),
        prisma.pollOption.update({
          where: { id: pollOptionId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);

      const totalVotes = await prisma.pollOption.aggregate({
        where: { contentId },
        _sum: { voteCount: true },
      });
      return reply.status(201).send({
        success: true,
        pollOptionId,
        totalVotes: totalVotes._sum.voteCount ?? 0,
      });
    }

    // No existing vote — create new vote + increment
    await prisma.$transaction([
      prisma.pollVote.create({
        data: { userId: currentUserId, pollOptionId },
      }),
      prisma.pollOption.update({
        where: { id: pollOptionId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    const totalVotes = await prisma.pollOption.aggregate({
      where: { contentId },
      _sum: { voteCount: true },
    });
    return reply.status(201).send({
      success: true,
      pollOptionId,
      totalVotes: totalVotes._sum.voteCount ?? 0,
    });
  });
}
