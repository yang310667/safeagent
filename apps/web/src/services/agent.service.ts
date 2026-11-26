import type {
  AgentChatRequest,
  AgentChatResponse,
  ApiErrorResponse,
  SseAgentStatusData,
  SseErrorData,
  SseEventPayload,
  SseEventType,
  SseMessageCompletedData,
  SseMessageDeltaData,
  SseToolCompletedData,
  SseToolStartedData,
} from '@safeagent/shared';
import { apiClient, ApiClientError, getApiBaseUrl, type ApiClient } from './api-client';

const AGENT_CHAT_TIMEOUT_MS = 60000;

export interface AgentStreamHandlers {
  onStatus?: (data: SseAgentStatusData) => void;
  onToolStarted?: (data: SseToolStartedData) => void;
  onToolCompleted?: (data: SseToolCompletedData) => void;
  onMessageDelta?: (data: SseMessageDeltaData) => void;
  onMessageCompleted?: (data: SseMessageCompletedData) => void;
}

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

function dispatchSseFrame(frame: string, handlers: AgentStreamHandlers): void {
  const lines = frame.split(/\r?\n/);
  let eventName: SseEventType | null = null;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() as SseEventType;
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!eventName || dataLines.length === 0) {
    return;
  }

  const rawJson = dataLines.join('\n');
  let parsed: SseEventPayload<unknown>;
  try {
    parsed = JSON.parse(rawJson) as SseEventPayload<unknown>;
  } catch {
    return;
  }

  const event = parsed.event || eventName;
  if (event === 'agent.status') {
    handlers.onStatus?.(parsed.data as SseAgentStatusData);
  } else if (event === 'tool.started') {
    handlers.onToolStarted?.(parsed.data as SseToolStartedData);
  } else if (event === 'tool.completed') {
    handlers.onToolCompleted?.(parsed.data as SseToolCompletedData);
  } else if (event === 'message.delta') {
    handlers.onMessageDelta?.(parsed.data as SseMessageDeltaData);
  } else if (event === 'message.completed') {
    handlers.onMessageCompleted?.(parsed.data as SseMessageCompletedData);
  } else if (event === 'error') {
    const err = parsed.data as SseErrorData;
    throw new ApiClientError({
      code: err.code || 'AGENT_STREAM_ERROR',
      message: err.message || '串流分析發生錯誤',
      requestId: err.requestId,
    });
  }
}

export async function streamAgentChat(
  payload: AgentChatRequest,
  handlers: AgentStreamHandlers,
  baseUrl = getApiBaseUrl(),
  externalSignal?: AbortSignal,
  timeoutMs = AGENT_CHAT_TIMEOUT_MS,
): Promise<AgentChatResponse | null> {
  const controller = new AbortController();
  let didTimeout = false;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, timeoutMs);

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  let completedResponse: AgentChatResponse | null = null;

  const wrappedHandlers: AgentStreamHandlers = {
    ...handlers,
    onMessageCompleted: (data) => {
      completedResponse = data.response;
      handlers.onMessageCompleted?.(data);
    },
  };

  try {
    const response = await fetch(`${normalizedBase}/api/agent/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseRequestId = response.headers.get('X-Request-Id') ?? undefined;

    if (!response.ok) {
      let errorData: Partial<ApiErrorResponse> | null = null;
      try {
        errorData = (await response.json()) as Partial<ApiErrorResponse>;
      } catch {
        errorData = null;
      }
      throw new ApiClientError({
        status: response.status,
        code: errorData?.error?.code || `HTTP_${response.status}`,
        message: errorData?.error?.message || `串流請求失敗 (${response.status})`,
        requestId: errorData?.requestId || responseRequestId,
      });
    }

    if (!response.body) {
      throw new ApiClientError({
        code: 'EMPTY_STREAM',
        message: '後端未回傳有效串流內容',
        requestId: responseRequestId,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        if (frame.trim()) {
          dispatchSseFrame(frame, wrappedHandlers);
        }
      }
    }

    if (buffer.trim()) {
      dispatchSseFrame(buffer, wrappedHandlers);
    }

    return completedResponse;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    if ((err instanceof DOMException || err instanceof Error) && err.name === 'AbortError') {
      if (didTimeout) {
        throw new ApiClientError({
          code: 'REQUEST_TIMEOUT',
          message: 'AI Agent 串流分析連線逾時',
          isTimeout: true,
        });
      }
      throw new ApiClientError({
        code: 'REQUEST_ABORTED',
        message: '串流分析已取消',
      });
    }
    throw new ApiClientError({
      code: 'NETWORK_ERROR',
      message: '無法連線至後端串流服務',
      isNetworkError: true,
    });
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}
