import type { MiddlewareHandler } from 'hono';
import type { WorkerEnv } from '../types/env';

export function parseAllowedOrigins(rawOrigins?: string): string[] {
  const source = rawOrigins && rawOrigins.trim().length > 0 ? rawOrigins : 'http://localhost:5173';
  return source
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Enforces an explicit CORS origin allowlist based on ALLOWED_ORIGINS.
 */
export const corsAllowlistMiddleware: MiddlewareHandler<WorkerEnv> = async (c, next) => {
  const origin = c.req.header('Origin');
  const allowedOrigins = parseAllowedOrigins(c.env?.ALLOWED_ORIGINS);
  const isAllowed = Boolean(origin && allowedOrigins.includes(origin));

  if (c.req.method === 'OPTIONS') {
    if (!isAllowed || !origin) {
      return c.body(null, 403);
    }
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
    c.header('Access-Control-Max-Age', '86400');
    c.header('Vary', 'Origin');
    return c.body(null, 204);
  }

  await next();

  if (isAllowed && origin) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Expose-Headers', 'X-Request-Id');
    c.header('Vary', 'Origin');
  }
};
