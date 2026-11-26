import type {
  AgentChatResponse,
  AgentStructuredAnalysis,
  AgentToolName,
  AgentToolTraceItem,
  KnowledgeArticle,
  ReferenceSourceItem,
  SseAgentStatusData,
  SseEventType,
  SseMessageCompletedData,
  SseMessageDeltaData,
  SseToolCompletedData,
  SseToolStartedData,
} from '@safeagent/shared';
import {
  DAY3_AGENT_TOOLS,
  executeSafetyTool,
  formatToolInputSummary,
} from '../tools/safety-tools';
import { SAFEAGENT_OUTPUT_JSON_SCHEMA, SAFEAGENT_SYSTEM_INSTRUCTIONS } from './prompts';

export const DEFAULT_OPENAI_MODEL = 'gpt-4.1-mini';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_REQUEST_TIMEOUT_MS = 25000;
const MAX_TOOL_ROUNDS = 4;

interface OpenAIOutputTextContent {
  type: string;
  text?: string;
}

interface OpenAIOutputItem {
  type: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: OpenAIOutputTextContent[];
}

export interface OpenAIResponsesPayload {
  id: string;
  model?: string;
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

interface ParsedModelOutput extends AgentStructuredAnalysis {
  reply: string;
}

export class AgentServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'AgentServiceError';
    this.status = status;
    this.code = code;
  }
}

export type AgentEventEmitter = (event: SseEventType, data: unknown) => void | Promise<void>;

export interface RunAgentTurnOptions {
  apiKey: string;
  model?: string;
  message: string;
  conversationId: string | null;
  customKnowledge?: KnowledgeArticle[];
  fetchImpl?: typeof fetch;
  onEvent?: AgentEventEmitter;
}

function deduplicateSources(sources: ReferenceSourceItem[]): ReferenceSourceItem[] {
  const seen = new Set<string>();
  const unique: ReferenceSourceItem[] = [];
  for (const src of sources) {
    const key = `${src.title}::${src.officialUrl}::${src.updatedAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(src);
    }
  }
  return unique;
}

export function extractOutputText(payload: OpenAIResponsesPayload): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }
  for (const item of payload.output ?? []) {
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const part of item.content) {
        if (part.type === 'output_text' && typeof part.text === 'string' && part.text.trim().length > 0) {
          return part.text;
        }
      }
    }
  }
  return '';
}

function parseStructuredOutput(rawText: string): ParsedModelOutput {
  if (!rawText.trim()) {
    throw new AgentServiceError(502, 'OPENAI_EMPTY_RESPONSE', 'OpenAI API 未回傳有效文字內容');
  }

  try {
    const parsed = JSON.parse(rawText) as Partial<ParsedModelOutput>;
    return {
      reply: typeof parsed.reply === 'string' && parsed.reply.trim() ? parsed.reply : rawText,
      scenarioSummary: typeof parsed.scenarioSummary === 'string' ? parsed.scenarioSummary : '',
      identifiedHazards: Array.isArray(parsed.identifiedHazards) ? parsed.identifiedHazards : [],
      clarificationQuestions: Array.isArray(parsed.clarificationQuestions)
        ? parsed.clarificationQuestions
        : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      limitationsNotice:
        typeof parsed.limitationsNotice === 'string' && parsed.limitationsNotice.trim()
          ? parsed.limitationsNotice
          : '本結果僅為研究概念驗證（PoC）輔助分析，不得視為正式職業安全衛生評估報告或作業安全許可。',
      preliminaryReportMarkdown:
        typeof parsed.preliminaryReportMarkdown === 'string'
          ? parsed.preliminaryReportMarkdown
          : '',
    };
  } catch {
    throw new AgentServiceError(502, 'OPENAI_INVALID_OUTPUT', '模型回傳格式不符合結構化 JSON 規範');
  }
}

export async function callResponsesApi(
  apiKey: string,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<OpenAIResponsesPayload> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OPENAI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = (await response.json()) as OpenAIResponsesPayload;

    if (!response.ok) {
      const apiMsg = data?.error?.message ? `（${data.error.message}）` : '';
      throw new AgentServiceError(
        502,
        'OPENAI_API_ERROR',
        `呼叫 OpenAI Responses API 失敗：HTTP ${response.status}${apiMsg}`,
      );
    }

    return data;
  } catch (err) {
    if (err instanceof AgentServiceError) {
      throw err;
    }
    if ((err instanceof DOMException || err instanceof Error) && err.name === 'AbortError') {
      throw new AgentServiceError(504, 'OPENAI_TIMEOUT', 'OpenAI Responses API 連線逾時，請稍後再試');
    }
    throw new AgentServiceError(502, 'OPENAI_NETWORK_ERROR', '無法連線至 OpenAI Responses API');
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runSingleAgentTurn(
  options: RunAgentTurnOptions,
): Promise<AgentChatResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolvedModel = options.model?.trim() || DEFAULT_OPENAI_MODEL;
  const emit = options.onEvent;

  const toolTraces: AgentToolTraceItem[] = [];
  const collectedSources: ReferenceSourceItem[] = [];

  let previousResponseId = options.conversationId ?? undefined;
  let nextInput: unknown = options.message;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const statusPayload: SseAgentStatusData = {
      stage: round === 0 ? 'analyzing' : 'synthesizing',
      message:
        round === 0
          ? '正在解析作業情境並規劃安全知識檢索...'
          : '正在根據檢索結果整理危害辨識與分析...',
      round: round + 1,
    };
    await emit?.('agent.status', statusPayload);

    const requestBody: Record<string, unknown> = {
      model: resolvedModel,
      instructions: SAFEAGENT_SYSTEM_INSTRUCTIONS,
      input: nextInput,
      tools: DAY3_AGENT_TOOLS,
      text: {
        format: {
          type: 'json_schema',
          name: 'safeagent_analysis_response',
          strict: true,
          schema: SAFEAGENT_OUTPUT_JSON_SCHEMA,
        },
      },
    };

    if (previousResponseId) {
      requestBody.previous_response_id = previousResponseId;
    }

    const response = await callResponsesApi(options.apiKey, requestBody, fetchImpl);
    previousResponseId = response.id;

    const functionCalls = (response.output ?? []).filter(
      (item) => item.type === 'function_call' && typeof item.name === 'string',
    );

    if (functionCalls.length === 0) {
      const rawText = extractOutputText(response);
      const parsed = parseStructuredOutput(rawText);

      const finalResponse: AgentChatResponse = {
        conversationId: response.id,
        reply: parsed.reply,
        model: response.model || resolvedModel,
        analysis: {
          scenarioSummary: parsed.scenarioSummary,
          identifiedHazards: parsed.identifiedHazards,
          clarificationQuestions: parsed.clarificationQuestions,
          recommendedActions: parsed.recommendedActions,
          limitationsNotice: parsed.limitationsNotice,
          preliminaryReportMarkdown: parsed.preliminaryReportMarkdown,
        },
        toolTraces,
        referenceSources: deduplicateSources(collectedSources),
      };

      if (emit) {
        const chunkSize = 48;
        for (let i = 0; i < finalResponse.reply.length; i += chunkSize) {
          const deltaPayload: SseMessageDeltaData = {
            text: finalResponse.reply.slice(i, i + chunkSize),
          };
          await emit('message.delta', deltaPayload);
        }
        const completedPayload: SseMessageCompletedData = {
          response: finalResponse,
        };
        await emit('message.completed', completedPayload);
      }

      return finalResponse;
    }

    if (round === MAX_TOOL_ROUNDS) {
      throw new AgentServiceError(
        502,
        'AGENT_MAX_ROUNDS_EXCEEDED',
        'Agent 工具呼叫次數超過上限，已中止本輪分析',
      );
    }

    const toolStatus: SseAgentStatusData = {
      stage: 'calling_tools',
      message: `正在執行 ${functionCalls.length} 項安全知識與風險工具...`,
      round: round + 1,
    };
    await emit?.('agent.status', toolStatus);

    const toolOutputs = [];
    for (let idx = 0; idx < functionCalls.length; idx++) {
      const call = functionCalls[idx];
      const callId = call.call_id || call.id || `call_${round}_${idx}`;
      const toolName = (call.name ?? 'search_safety_knowledge') as AgentToolName;
      const rawArgs = call.arguments ?? '{}';

      const startedPayload: SseToolStartedData = {
        id: callId,
        toolName,
        inputSummary: formatToolInputSummary(rawArgs),
      };
      await emit?.('tool.started', startedPayload);

      const result = executeSafetyTool(
        toolName,
        rawArgs,
        callId,
        options.customKnowledge ?? [],
      );
      toolTraces.push(result.traceItem);
      collectedSources.push(...result.sources);

      const completedToolPayload: SseToolCompletedData = {
        trace: result.traceItem,
      };
      await emit?.('tool.completed', completedToolPayload);

      toolOutputs.push({
        type: 'function_call_output',
        call_id: callId,
        output: result.outputJson,
      });
    }
    nextInput = toolOutputs;
  }

  throw new AgentServiceError(
    502,
    'AGENT_MAX_ROUNDS_EXCEEDED',
    'Agent 工具呼叫次數超過上限，已中止本輪分析',
  );
}
