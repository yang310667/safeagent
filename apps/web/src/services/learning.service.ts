import type { LearningPlanRequest, LearningPlanResponse } from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

const LEARNING_PLAN_TIMEOUT_MS = 45000;

export async function requestLearningPlan(
  payload: LearningPlanRequest,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<LearningPlanResponse> {
  return client.request<LearningPlanResponse>('/api/learning/plan', {
    method: 'POST',
    body: payload,
    timeoutMs: LEARNING_PLAN_TIMEOUT_MS,
    signal,
  });
}
