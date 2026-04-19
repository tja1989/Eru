import type { FastifyRequest, FastifyReply } from 'fastify';
import { Errors } from '../utils/errors.js';

export async function webhookAuthMiddleware(request: FastifyRequest, _reply: FastifyReply) {
  const headerSecret = request.headers['x-webhook-secret'];
  const expected = process.env.MEDIACONVERT_WEBHOOK_SECRET;
  if (!expected) {
    throw Errors.unauthorized('Webhook not configured');
  }
  if (headerSecret !== expected) {
    throw Errors.unauthorized('Invalid webhook secret');
  }
}
