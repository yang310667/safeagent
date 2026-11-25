export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}

export interface ConfigResponse {
  agentEnabled: boolean;
  demoEnabled: boolean;
  knowledgeBaseEnabled: boolean;
  version: string;
}

export interface AgentChatRequest {
  message: string;
  conversationId: string | null;
}

export interface AgentChatResponse {
  conversationId: string;
  reply: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
  requestId?: string;
}

export type AgentToolName =
  | 'search_safety_knowledge'
  | 'search_accident_cases'
  | 'identify_hazards'
  | 'calculate_risk'
  | 'generate_report';

export type ToolExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface AgentToolTraceItem {
  id: string;
  toolName: AgentToolName;
  executionStatus: ToolExecutionStatus;
  executionDurationMs: number | null;
  inputSummary: string;
  outputSummary: string;
  referenceSources: ReferenceSourceItem[];
}

export interface ReferenceSourceItem {
  title: string;
  publisher: string;
  officialUrl: string;
  updatedAt: string;
  citationSummary: string;
}

export type SseEventType =
  | 'agent.status'
  | 'tool.started'
  | 'tool.completed'
  | 'message.delta'
  | 'message.completed'
  | 'error';

export interface SseEventPayload<T = unknown> {
  event: SseEventType;
  data: T;
  timestamp: string;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  disclaimer: string;
}

export type KnowledgeCategory =
  | '職安基礎'
  | '職業安全衛生法規'
  | '危害辨識'
  | '風險評估'
  | '製程安全'
  | '機械安全'
  | '電氣安全'
  | '高處作業'
  | '化學品安全'
  | '智慧工安';

export type RiskLevel = 'low' | 'medium' | 'high';
