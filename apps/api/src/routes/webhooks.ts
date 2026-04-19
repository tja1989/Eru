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
      type?: string;
      playlistFilePaths?: string[];
      outputDetails?: Array<{ outputFilePaths?: string[] }>;
    }>;
    errorCode?: string;
  };
}

function stripS3Prefix(s: string): string {
  return s.replace(/^s3:\/\/[^/]+\//, '');
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
      const group = event.detail.outputGroupDetails?.[0];
      const isHls = group?.type === 'HLS_GROUP'
        || (group?.playlistFilePaths?.[0]?.endsWith('.m3u8') ?? false);

      if (isHls && group?.playlistFilePaths?.[0]) {
        const masterPath = stripS3Prefix(group.playlistFilePaths[0]);
        const variantPaths = (group.outputDetails ?? [])
          .map(o => (o.outputFilePaths?.[0] ? stripS3Prefix(o.outputFilePaths[0]) : undefined))
          .filter((k): k is string => typeof k === 'string');

        const p240 = variantPaths.find(p => p.includes('240p'));
        const p360 = variantPaths.find(p => p.includes('360p'));
        const p540 = variantPaths.find(p => p.includes('540p'));
        const p720 = variantPaths.find(p => p.includes('720p'));
        const p1080 = variantPaths.find(p => p.includes('1080p'));

        if (!p360 || !p720 || !p1080) {
          throw Errors.badRequest('Missing required HLS rungs (360/720/1080)');
        }

        await handleTranscodeComplete(mediaId, {
          hlsManifest: masterPath,
          p240, p360, p540, p720, p1080,
        });
      } else {
        const outputs = group?.outputDetails ?? [];
        const keys = outputs
          .map(o => o.outputFilePaths?.[0])
          .filter((k): k is string => typeof k === 'string')
          .map(stripS3Prefix);

        const p360 = keys.find(k => k.includes('_360p'));
        const p720 = keys.find(k => k.includes('_720p'));
        const p1080 = keys.find(k => k.includes('_1080p'));

        if (!p360 || !p720 || !p1080) {
          throw Errors.badRequest('Incomplete output set from MediaConvert');
        }

        await handleTranscodeComplete(mediaId, { hlsManifest: '', p360, p720, p1080 });
      }
    } else if (event.detail?.status === 'ERROR') {
      await handleTranscodeFailed(mediaId);
    } else {
      throw Errors.badRequest('Unknown MediaConvert status');
    }

    return reply.status(200).send({ ok: true });
  });
}
