import { Hono } from 'hono';
import type { AgentChatRequest, ApiErrorResponse } from '@safeagent/shared';
import type { WorkerEnv } from '../types/env';

export const agentRoutes = new Hono<WorkerEnv>();

agentRoutes.post('/agent/chat', async (c) => {
  const requestId = c.get('requestId');

  let body: Partial<AgentChatRequest>;
  try {
    body = await c.req.json<Partial<AgentChatRequest>>();
  } catch {
    const errorPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_JSON',
        message: '請求內容必須為有效的 JSON 格式',
      },
      requestId,
    };
    return c.json(errorPayload, 400);
  }

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    const errorPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'message 欄位為必填且不得為空',
      },
      requestId,
    };
    return c.json(errorPayload, 400);
  }

  if (body.conversationId !== undefined && body.conversationId !== null && typeof body.conversationId !== 'string') {
    const errorPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'conversationId 必須為字串或 null',
      },
      requestId,
    };
    return c.json(errorPayload, 400);
  }

  const notImplementedPayload: ApiErrorResponse = {
    error: {
      code: 'AGENT_NOT_IMPLEMENTED',
      message: 'AI Agent 尚未啟用',
    },
    requestId,
  };
  return c.json(notImplementedPayload, 501);
});
