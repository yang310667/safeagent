import type { AgentChatRequest, AgentChatResponse } from '@safeagent/shared';
import { apiClient, type ApiClient } from './api-client';

const AGENT_CHAT_TIMEOUT_MS = 60000;

export async function sendAgentChat(
  payload: AgentChatRequest,
  client: ApiClient = apiClient,
  signal?: AbortSignal,
): Promise<AgentChatResponse> {
  return client.request<AgentChatResponse>('/api/agent/chat', {
    method: 'POST',
    body: payload,
    timeoutMs: AGENT_CHAT_TIMEOUT_MS,
    signal,
  });
}
