import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types/env';

/**
 * Reserved rate-limiting middleware hook for future Cloudflare Rate Limiting binding.
 * Day 1: Pass-through only; rate limiting enforcement is not active yet.
 */
export const rateLimitMiddleware: MiddlewareHandler<WorkerEnv> = async (_c, next) => {
  await next();
};
