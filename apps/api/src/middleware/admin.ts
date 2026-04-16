import type { FastifyRequest, FastifyReply } from 'fastify';
import { Errors } from '../utils/errors.js';

export async function adminMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (request.userRole !== 'admin') {
    throw Errors.forbidden('Admin access required');
  }
}
