import { Hono } from 'hono';
import type { ConfigResponse } from '@safeagent/shared';
import type { WorkerEnv } from '../types/env';

export const configRoutes = new Hono<WorkerEnv>();

configRoutes.get('/config', (c) => {
  // Agent is enabled only when explicitly turned on AND an API key is configured.
  // Never expose OPENAI_API_KEY or any secret bindings in this response.
  const hasApiKey = Boolean(c.env?.OPENAI_API_KEY?.trim());
  const isAgentFlagOn = c.env?.AGENT_ENABLED === 'true';

  const payload: ConfigResponse = {
    agentEnabled: isAgentFlagOn && hasApiKey,
    demoEnabled: false,
    knowledgeBaseEnabled: true,
    version: c.env?.APP_VERSION || '0.1.0',
  };
  return c.json(payload, 200);
});
