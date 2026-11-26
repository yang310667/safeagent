import type { EvaluationCaseResult, EvaluationReportResponse } from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

const EVALUATION_RUN_TIMEOUT_MS = 60000;

export async function fetchEvaluationReport(
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<EvaluationReportResponse> {
  return client.request<EvaluationReportResponse>('/api/evaluation', {
    method: 'GET',
    signal,
  });
}

export async function runEvaluationBenchmarkCase(
  caseId: string,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<EvaluationCaseResult> {
  return client.request<EvaluationCaseResult>('/api/evaluation/run', {
    method: 'POST',
    body: { caseId },
    timeoutMs: EVALUATION_RUN_TIMEOUT_MS,
    signal,
  });
}
