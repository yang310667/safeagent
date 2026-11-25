import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types/env';

/**
 * Assigns a unique request ID for tracing without logging sensitive payloads.
 */
export const requestIdMiddleware: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  const incomingId = c.req.header('X-Request-Id');
  const requestId = incomingId && incomingId.trim().length > 0 ? incomingId.trim() : crypto.randomUUID();
  c.set('requestId', requestId);
  await next();
  c.header('X-Request-Id', requestId);
};
