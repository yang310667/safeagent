import type { ConfigResponse } from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

export async function fetchConfig(
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<ConfigResponse> {
  return client.request<ConfigResponse>('/api/config', {
    method: 'GET',
    signal,
  });
}
