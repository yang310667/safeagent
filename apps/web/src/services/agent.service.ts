import type { AgentChatRequest, AgentChatResponse } from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

export async function sendAgentChat(
  payload: AgentChatRequest,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<AgentChatResponse> {
  return client.request<AgentChatResponse>('/api/agent/chat', {
    method: 'POST',
    body: payload,
    signal,
  });
}
