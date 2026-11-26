import { Hono } from 'hono';
import type { ApiErrorResponse, KnowledgeCategory, LearningPlanRequest } from '@safeagent/shared';
import { generateAiLearningPlan } from '../agent/learning-planner';
import { AgentServiceError } from '../agent/responses-client';
import type { WorkerEnv } from '../types/env';

export const learningRoutes = new Hono<WorkerEnv>();

learningRoutes.post('/learning/plan', async (c) => {
  const requestId = c.get('requestId');

  let body: Partial<LearningPlanRequest>;
  try {
    body = await c.req.json<Partial<LearningPlanRequest>>();
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

  if (typeof body.goal !== 'string' || !body.goal.trim()) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'INVALID_REQUEST',
        message: 'goal 學習目標為必填欄位',
      },
      requestId,
    };
    return c.json(errPayload, 400);
  }

  const weeklyHours =
    typeof body.weeklyHours === 'number' && body.weeklyHours >= 1 && body.weeklyHours <= 40
      ? Math.round(body.weeklyHours)
      : 4;
  const targetWeeks =
    typeof body.targetWeeks === 'number' && body.targetWeeks >= 1 && body.targetWeeks <= 12
      ? Math.round(body.targetWeeks)
      : 4;

  if (c.env?.AGENT_ENABLED !== 'true' || !c.env?.OPENAI_API_KEY?.trim()) {
    const errPayload: ApiErrorResponse = {
      error: {
        code: 'AGENT_DISABLED',
        message: 'Live Agent 目前未啟用或缺少 OPENAI_API_KEY，無法使用 AI 學習規劃',
      },
      requestId,
    };
    return c.json(errPayload, 503);
  }

  try {
    const plan = await generateAiLearningPlan({
      apiKey: c.env.OPENAI_API_KEY.trim(),
      model: c.env?.OPENAI_MODEL,
      request: {
        goal: body.goal.trim(),
        weeklyHours,
        targetWeeks,
        focusCategories: Array.isArray(body.focusCategories)
          ? (body.focusCategories.filter((cat): cat is KnowledgeCategory => typeof cat === 'string'))
          : [],
        completedTopics: Array.isArray(body.completedTopics)
          ? body.completedTopics.filter((t): t is string => typeof t === 'string').slice(0, 20)
          : [],
      },
    });
    return c.json(plan, 200);
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
        code: 'LEARNING_PLAN_FAILED',
        message: '產生 AI 自主學習規劃時發生錯誤',
      },
      requestId,
    };
    return c.json(errPayload, 500);
  }
});
