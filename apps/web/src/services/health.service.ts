import type { HealthResponse } from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

export async function fetchHealth(
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<HealthResponse> {
  return client.request<HealthResponse>('/api/health', {
    method: 'GET',
    signal,
  });
}
