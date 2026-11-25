import { Hono } from 'hono';
import type { HealthResponse } from '@safeagent/shared';
import type { WorkerEnv } from '../types/env';

export const healthRoutes = new Hono<WorkerEnv>();

healthRoutes.get('/health', (c) => {
  const payload: HealthResponse = {
    status: 'ok',
    service: 'safeagent-worker',
    version: c.env?.APP_VERSION || '0.1.0',
    timestamp: new Date().toISOString(),
  };
  return c.json(payload, 200);
});
