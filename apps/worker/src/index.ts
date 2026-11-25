import { Hono } from 'hono';
import type { ApiErrorResponse } from '@safeagent/shared';
import { corsAllowlistMiddleware } from './middleware/cors';
import { rateLimitMiddleware } from './middleware/rate-limit';
import { requestIdMiddleware } from './middleware/request-id';
import { agentRoutes } from './routes/agent';
import { configRoutes } from './routes/config';
import { healthRoutes } from './routes/health';
import type { WorkerEnv } from './types/env';

export function createApp(): Hono<WorkerEnv> {
  const app = new Hono<WorkerEnv>();

  app.use('*', requestIdMiddleware);
  app.use('/api/*', corsAllowlistMiddleware);
  app.use('/api/*', rateLimitMiddleware);

  app.route('/api', healthRoutes);
  app.route('/api', configRoutes);
  app.route('/api', agentRoutes);

  app.notFound((c) => {
    const payload: ApiErrorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: '找不到指定的 API 路徑',
      },
      requestId: c.get('requestId'),
    };
    return c.json(payload, 404);
  });

  app.onError((err, c) => {
    // Log only high-level error message, never request secrets or environment variables.
    console.error('[Worker Error]', err.message);
    const payload: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '伺服器發生未預期的錯誤',
      },
      requestId: c.get('requestId'),
    };
    return c.json(payload, 500);
  });

  return app;
}

const app = createApp();

export default app;
