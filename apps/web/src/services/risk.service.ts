import type {
  PreliminaryReportInput,
  PreliminarySafetyReport,
  RiskAssessmentInput,
  RiskAssessmentRecord,
} from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

export async function calculateRiskAssessment(
  payload: RiskAssessmentInput,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<RiskAssessmentRecord> {
  return client.request<RiskAssessmentRecord>('/api/risk/calculate', {
    method: 'POST',
    body: payload,
    signal,
  });
}

export async function generatePreliminaryReport(
  payload: PreliminaryReportInput,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<PreliminarySafetyReport> {
  return client.request<PreliminarySafetyReport>('/api/risk/report', {
    method: 'POST',
    body: payload,
    signal,
  });
}
