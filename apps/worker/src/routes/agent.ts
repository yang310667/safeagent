import { Hono } from 'hono';
import type { AgentChatRequest, ApiErrorResponse } from '@safeagent/shared';
import { AgentServiceError, runSingleAgentTurn } from '../agent/responses-client';
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

  if (
    body.conversationId !== undefined &&
    body.conversationId !== null &&
    typeof body.conversationId !== 'string'
  ) {
    const errorPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'conversationId 必須為字串或 null',
      },
      requestId,
    };
    return c.json(errorPayload, 400);
  }

  if (c.env?.AGENT_ENABLED !== 'true') {
    const disabledPayload: ApiErrorResponse = {
      error: {
        code: 'AGENT_DISABLED',
        message: 'Live Agent 目前未啟用（AGENT_ENABLED=false）',
      },
      requestId,
    };
    return c.json(disabledPayload, 503);
  }

  const apiKey = c.env?.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const missingKeyPayload: ApiErrorResponse = {
      error: {
        code: 'AGENT_NOT_CONFIGURED',
        message: '後端尚未設定 OPENAI_API_KEY，無法啟動 Live Agent',
      },
      requestId,
    };
    return c.json(missingKeyPayload, 503);
  }

  try {
    const result = await runSingleAgentTurn({
      apiKey,
      model: c.env?.OPENAI_MODEL,
      message: body.message.trim(),
      conversationId: body.conversationId ?? null,
    });
    return c.json(result, 200);
  } catch (err) {
    if (err instanceof AgentServiceError) {
      const errorPayload: ApiErrorResponse = {
        error: {
          code: err.code,
          message: err.message,
        },
        requestId,
      };
      return c.json(errorPayload, err.status as 502 | 504);
    }

    console.error('[Agent Route Error]', err instanceof Error ? err.message : 'Unknown error');
    const fallbackPayload: ApiErrorResponse = {
      error: {
        code: 'AGENT_EXECUTION_FAILED',
        message: '執行 AI Agent 分析時發生未預期的錯誤',
      },
      requestId,
    };
    return c.json(fallbackPayload, 500);
  }
});
