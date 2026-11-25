import { Hono } from 'hono';
import type { ConfigResponse } from '@safeagent/shared';
import type { WorkerEnv } from '../types/env';

export const configRoutes = new Hono<WorkerEnv>();

configRoutes.get('/config', (c) => {
  // Day 1: Agent, Demo, and Knowledge Base are intentionally disabled.
  // Never expose OPENAI_API_KEY or any secret bindings in this response.
  const payload: ConfigResponse = {
    agentEnabled: false,
    demoEnabled: false,
    knowledgeBaseEnabled: false,
    version: c.env?.APP_VERSION || '0.1.0',
  };
  return c.json(payload, 200);
});
