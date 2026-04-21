import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { sponsorshipService } from '../services/sponsorshipService.js';
import { Errors } from '../utils/errors.js';
import type {
  CreatorDashboardResponse,
  SponsorshipActionResponse,
} from '@eru/shared';

const negotiateSchema = z.object({
  counterBoostAmount: z.number().positive(),
  note: z.string().max(500).optional(),
});

export async function sponsorshipRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  app.get('/sponsorship/dashboard', async (request): Promise<CreatorDashboardResponse> => {
    const data = await sponsorshipService.getCreatorDashboard(request.userId);
    return data as unknown as CreatorDashboardResponse;
  });

  app.post('/sponsorship/:id/accept', async (request): Promise<SponsorshipActionResponse> => {
    const { id } = request.params as { id: string };
    const proposal = await sponsorshipService.accept(id, request.userId);
    return { proposal: proposal as unknown as SponsorshipActionResponse['proposal'] };
  });

  app.post('/sponsorship/:id/decline', async (request): Promise<SponsorshipActionResponse> => {
    const { id } = request.params as { id: string };
    const proposal = await sponsorshipService.decline(id, request.userId);
    return { proposal: proposal as unknown as SponsorshipActionResponse['proposal'] };
  });

  app.post('/sponsorship/:id/negotiate', async (request): Promise<SponsorshipActionResponse> => {
    const { id } = request.params as { id: string };
    const parsed = negotiateSchema.safeParse(request.body);
    if (!parsed.success) throw Errors.badRequest(parsed.error.issues[0].message);
    const proposal = await sponsorshipService.negotiate(
      id,
      request.userId,
      parsed.data.counterBoostAmount,
      parsed.data.note,
    );
    return { proposal: proposal as unknown as SponsorshipActionResponse['proposal'] };
  });
}
