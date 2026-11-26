import type {
  HazardCatalogResponse,
  KnowledgeArticle,
  KnowledgeSearchResponse,
} from '@safeagent/shared';
import { ApiClient, apiClient } from './api-client';

export interface KnowledgeQueryParams {
  query?: string;
  category?: string;
  type?: string;
}

export interface HazardQueryParams {
  query?: string;
  category?: string;
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const trimmed = value?.trim();
    if (trimmed && trimmed !== '全部') {
      searchParams.set(key, trimmed);
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchKnowledgeArticles(
  params: KnowledgeQueryParams = {},
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<KnowledgeSearchResponse> {
  const qs = buildQueryString({
    q: params.query,
    category: params.category,
    type: params.type,
  });
  return client.request<KnowledgeSearchResponse>(`/api/knowledge${qs}`, {
    method: 'GET',
    signal,
  });
}

export async function fetchKnowledgeArticleById(
  id: string,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<KnowledgeArticle> {
  return client.request<KnowledgeArticle>(`/api/knowledge/${encodeURIComponent(id)}`, {
    method: 'GET',
    signal,
  });
}

export async function fetchHazards(
  params: HazardQueryParams = {},
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<HazardCatalogResponse> {
  const qs = buildQueryString({
    q: params.query,
    category: params.category,
  });
  return client.request<HazardCatalogResponse>(`/api/hazards${qs}`, {
    method: 'GET',
    signal,
  });
}
