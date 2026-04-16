import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '../utils/redis.js';
import { Errors } from '../utils/errors.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, requests: number, window: string): Ratelimit {
  const key = `${name}:${requests}:${window}`;
  if (!limiters.has(key)) {
    limiters.set(key, new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(requests, window),
      prefix: `ratelimit:${name}`,
    }));
  }
  return limiters.get(key)!;
}

export function rateLimitByUser(requests: number, window: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const limiter = getLimiter('user', requests, window);
    const identifier = request.userId || request.ip;
    const { success, remaining } = await limiter.limit(identifier);
    reply.header('X-RateLimit-Remaining', remaining);
    if (!success) {
      throw Errors.tooManyRequests();
    }
  };
}

export function rateLimitByIp(requests: number, window: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const limiter = getLimiter('ip', requests, window);
    const { success, remaining } = await limiter.limit(request.ip);
    reply.header('X-RateLimit-Remaining', remaining);
    if (!success) {
      throw Errors.tooManyRequests();
    }
  };
}
