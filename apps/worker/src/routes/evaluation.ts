import { Hono } from 'hono';
import type { ApiErrorResponse } from '@safeagent/shared';
import { runSingleAgentTurn, AgentServiceError } from '../agent/responses-client';
import {
  evaluateAgentCaseResponse,
  getBenchmarkCaseById,
  getEvaluationReport,
} from '../services/evaluation.service';
import type { WorkerEnv } from '../types/env';

export const evaluationRoutes = new Hono<WorkerEnv>();

evaluationRoutes.get('/evaluation', (c) => {
  const report = getEvaluationReport();
  return c.json(report, 200);
});

evaluationRoutes.post('/evaluation/run', async (c) => {
  const requestId = c.get('requestId');

  let body: { caseId?: string };
  try {
    body = await c.req.json<{ caseId?: string }>();
  } catch {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_JSON',
        message: '請求內容必須為有效的 JSON 格式',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  const caseId = typeof body.caseId === 'string' ? body.caseId.trim() : '';
  const benchmarkCase = getBenchmarkCaseById(caseId);
  if (!benchmarkCase) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'EVALUATION_CASE_NOT_FOUND',
        message: '找不到指定的基準測試案例',
      },
      requestId,
    };
    return c.json(errPayload, 404);
  }

  if (c.env?.AGENT_ENABLED !== 'true' || !c.env?.OPENAI_API_KEY?.trim()) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'AGENT_DISABLED',
        message: 'Live Agent 未啟用或缺少 OPENAI_API_KEY，無法即時執行基準測試',
      },
      requestId,
    };
    return c.json(errPayload, 503);
  }

  const startedAt = Date.now();
  try {
    const response = await runSingleAgentTurn({
      apiKey: c.env.OPENAI_API_KEY.trim(),
      model: c.env?.OPENAI_MODEL,
      message: benchmarkCase.prompt,
      conversationId: null,
    });
    const result = evaluateAgentCaseResponse(
      benchmarkCase,
      response,
      Math.max(1, Date.now() - startedAt),
    );
    return c.json(result, 200);
  } catch (err) {
    if (err instanceof AgentServiceError) {
      const errPayload: ApiErrorResponse = {
        error: {
          code: err.code,
          message: err.message,
        },
        requestId,
      };
      return c.json(errPayload, err.status as 502 | 504);
    }

    const errPayload: ApiErrorResponse = {
      error: {
        code: 'EVALUATION_RUN_FAILED',
        message: '執行評估基準案例時發生錯誤',
      },
      requestId,
    };
    return c.json(errPayload, 500);
  }
});
