import type { AccidentCaseItem, AccidentCaseSearchResponse } from '@safeagent/shared';
import { ApiClient, apiClient } from './api-client';

export interface AccidentCaseQueryParams {
  query?: string;
  industry?: string;
  hazardType?: string;
}

export async function fetchAccidentCases(
  params: AccidentCaseQueryParams = {},
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<AccidentCaseSearchResponse> {
  const searchParams = new URLSearchParams();
  if (params.query?.trim()) {
    searchParams.set('q', params.query.trim());
  }
  if (params.industry?.trim()) {
    searchParams.set('industry', params.industry.trim());
  }
  if (params.hazardType?.trim()) {
    searchParams.set('hazardType', params.hazardType.trim());
  }
  const qs = searchParams.toString();
  return client.request<AccidentCaseSearchResponse>(
    `/api/accident-cases${qs ? `?${qs}` : ''}`,
    {
      method: 'GET',
      signal,
    },
  );
}

export async function fetchAccidentCaseById(
  id: string,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<AccidentCaseItem> {
  return client.request<AccidentCaseItem>(`/api/accident-cases/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal,
  });
}
