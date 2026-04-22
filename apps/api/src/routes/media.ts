import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitByUser } from '../middleware/rateLimit.js';
import { generatePresignedUploadUrl } from '../services/mediaService.js';
import { Errors } from '../utils/errors.js';
import { PLACEHOLDER_CONTENT_ID } from '../utils/placeholderContent.js';

const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024; // 300 MB

const uploadSchema = z.object({
  contentType: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const presignSchema = z.object({
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export async function mediaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);

  // POST /media/upload — generate a presigned URL and create a ContentMedia record
  // The client will use the presigned URL to upload directly to S3.
  // The ContentMedia row is pre-created with a placeholder contentId so that
  // it can be linked to real content in the /content/create endpoint.
  app.post('/media/upload', {
    preHandler: [rateLimitByUser(20, '1 m')],
  }, async (request, reply) => {
    const parsed = uploadSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { contentType, width, height } = parsed.data;

    // Determine media type from MIME type
    const isVideo = contentType.startsWith('video/');
    const isImage = contentType.startsWith('image/');
    if (!isVideo && !isImage) {
      throw Errors.badRequest('contentType must be a video or image MIME type');
    }

    const { uploadUrl, mediaId, key } = await generatePresignedUploadUrl(
      request.userId,
      contentType,
    );

    const originalUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`;

    // Pre-create the ContentMedia row using a placeholder contentId.
    // The content/create endpoint will update this to the real contentId.
    const media = await prisma.contentMedia.create({
      data: {
        id: mediaId,
        contentId: PLACEHOLDER_CONTENT_ID,
        type: isVideo ? 'video' : 'image',
        originalUrl,
        width,
        height,
        transcodeStatus: isVideo ? 'pending' : 'complete',
      },
    });

    return reply.status(201).send({ uploadUrl, media });
  });

  // POST /media/presign — generate a presigned URL only (no DB record created)
  // For clients that want to upload first and decide later whether to publish.
  app.post('/media/presign', {
    preHandler: [rateLimitByUser(30, '1 m')],
  }, async (request, reply) => {
    const parsed = presignSchema.safeParse(request.body);
    if (!parsed.success) {
      throw Errors.badRequest(parsed.error.issues[0].message);
    }

    const { contentType, size } = parsed.data;

    if (size > MAX_FILE_SIZE_BYTES) {
      throw Errors.badRequest('File size exceeds the 300 MB limit');
    }

    const isVideo = contentType.startsWith('video/');
    const isImage = contentType.startsWith('image/');
    if (!isVideo && !isImage) {
      throw Errors.badRequest('contentType must be a video or image MIME type');
    }

    const { uploadUrl, mediaId, key } = await generatePresignedUploadUrl(
      request.userId,
      contentType,
    );

    return reply.status(200).send({ uploadUrl, mediaId, key });
  });
}
