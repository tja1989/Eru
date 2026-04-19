import type { FastifyInstance } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { Errors } from '../utils/errors.js';
import { webhookAuthMiddleware } from '../middleware/webhookAuth.js';
import { handleTranscodeComplete, handleTranscodeFailed } from '../services/transcodeService.js';

interface MediaConvertEvent {
  source?: string;
  detail?: {
    status?: 'COMPLETE' | 'ERROR';
    userMetadata?: { mediaId?: string };
    outputGroupDetails?: Array<{
      outputDetails?: Array<{ outputFilePaths?: string[] }>;
    }>;
    errorCode?: string;
  };
}

export async function webhookRoutes(app: FastifyInstance) {
  app.addHook('preHandler', webhookAuthMiddleware);

  app.post('/webhooks/mediaconvert', async (request, reply) => {
    const event = request.body as MediaConvertEvent;
    if (event.source !== 'aws.mediaconvert') {
      throw Errors.badRequest('Not a MediaConvert event');
    }

    const mediaId = event.detail?.userMetadata?.mediaId;
    if (!mediaId) {
      throw Errors.badRequest('Missing mediaId in userMetadata');
    }

    const media = await prisma.contentMedia.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw Errors.notFound('ContentMedia');
    }

    if (event.detail?.status === 'COMPLETE') {
      const outputs = event.detail.outputGroupDetails?.[0]?.outputDetails ?? [];
      const keys = outputs
        .map(o => o.outputFilePaths?.[0])
        .filter((k): k is string => typeof k === 'string')
        .map(k => k.replace(/^s3:\/\/[^/]+\//, ''));

      const p360 = keys.find(k => k.includes('_360p'));
      const p720 = keys.find(k => k.includes('_720p'));
      const p1080 = keys.find(k => k.includes('_1080p'));

      if (!p360 || !p720 || !p1080) {
        throw Errors.badRequest('Incomplete output set from MediaConvert');
      }

      await handleTranscodeComplete(mediaId, { p360, p720, p1080 });
    } else if (event.detail?.status === 'ERROR') {
      await handleTranscodeFailed(mediaId);
    } else {
      throw Errors.badRequest('Unknown MediaConvert status');
    }

    return reply.status(200).send({ ok: true });
  });
}
