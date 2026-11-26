import { Hono, type Context } from 'hono';
import type { AgentChatRequest, ApiErrorResponse, SseErrorData } from '@safeagent/shared';
import { AgentServiceError, runSingleAgentTurn } from '../agent/responses-client';
import { createSseHeaders, formatSseEvent } from '../services/sse';
import type { WorkerEnv } from '../types/env';

export const agentRoutes = new Hono<WorkerEnv>();

async function validateAndAuthorizeAgentRequest(
  c: Context<WorkerEnv>,
): Promise<
  | { ok: true; message: string; conversationId: string | null; apiKey: string }
  | { ok: false; response: Response }
> {
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
    return { ok: false, response: c.json(errorPayload, 400) };
  }

  if (typeof body.message !== 'string' || body.message.trim().length === 0) {
    const errorPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'message 欄位為必填且不得為空',
      },
      requestId,
    };
    return { ok: false, response: c.json(errorPayload, 400) };
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
    return { ok: false, response: c.json(errorPayload, 400) };
  }

  if (c.env?.AGENT_ENABLED !== 'true') {
    const disabledPayload: ApiErrorResponse = {
      error: {
        code: 'AGENT_DISABLED',
        message: 'Live Agent 目前未啟用（AGENT_ENABLED=false）',
      },
      requestId,
    };
    return { ok: false, response: c.json(disabledPayload, 503) };
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
    return { ok: false, response: c.json(missingKeyPayload, 503) };
  }

  return {
    ok: true,
    message: body.message.trim(),
    conversationId: body.conversationId ?? null,
    apiKey,
  };
}

agentRoutes.post('/agent/chat', async (c) => {
  const requestId = c.get('requestId');
  const validated = await validateAndAuthorizeAgentRequest(c);
  if (!validated.ok) {
    return validated.response;
  }

  try {
    const result = await runSingleAgentTurn({
      apiKey: validated.apiKey,
      model: c.env?.OPENAI_MODEL,
      message: validated.message,
      conversationId: validated.conversationId,
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

agentRoutes.post('/agent/chat/stream', async (c) => {
  const requestId = c.get('requestId');
  const validated = await validateAndAuthorizeAgentRequest(c);
  if (!validated.ok) {
    return validated.response;
  }

  const encoder = new TextEncoder();
  const model = c.env?.OPENAI_MODEL;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendEvent = (event: Parameters<typeof formatSseEvent>[0], data: unknown) => {
        controller.enqueue(encoder.encode(formatSseEvent(event, data)));
      };

      try {
        await runSingleAgentTurn({
          apiKey: validated.apiKey,
          model,
          message: validated.message,
          conversationId: validated.conversationId,
          onEvent: (event, data) => {
            sendEvent(event, data);
          },
        });
      } catch (err) {
        const errorData: SseErrorData =
          err instanceof AgentServiceError
            ? { code: err.code, message: err.message, requestId }
            : {
                code: 'AGENT_EXECUTION_FAILED',
                message: '執行 AI Agent 串流分析時發生未預期的錯誤',
                requestId,
              };
        sendEvent('error', errorData);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...createSseHeaders(),
      'X-Request-Id': requestId,
    },
  });
});
