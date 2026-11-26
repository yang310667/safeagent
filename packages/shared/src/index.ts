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

export interface IdentifiedHazardItem {
  hazardType: string;
  description: string;
  potentialConsequence: string;
  recommendedControls: string[];
  relatedRegulations: string[];
}

export interface AgentStructuredAnalysis {
  scenarioSummary: string;
  identifiedHazards: IdentifiedHazardItem[];
  clarificationQuestions: string[];
  recommendedActions: string[];
  limitationsNotice: string;
  preliminaryReportMarkdown?: string;
}

export interface AgentChatResponse {
  conversationId: string;
  reply: string;
  model: string;
  analysis: AgentStructuredAnalysis;
  toolTraces: AgentToolTraceItem[];
  referenceSources: ReferenceSourceItem[];
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

export interface SseAgentStatusData {
  stage: 'analyzing' | 'calling_tools' | 'synthesizing';
  message: string;
  round?: number;
}

export interface SseToolStartedData {
  id: string;
  toolName: AgentToolName;
  inputSummary: string;
}

export interface SseToolCompletedData {
  trace: AgentToolTraceItem;
}

export interface SseMessageDeltaData {
  text: string;
}

export interface SseMessageCompletedData {
  response: AgentChatResponse;
}

export interface SseErrorData {
  code: string;
  message: string;
  requestId?: string;
}

export interface EvaluationCriterionMetric {
  key:
    | 'hazardCompleteness'
    | 'regulationAccuracy'
    | 'sourceTraceability'
    | 'riskCalculationAccuracy'
    | 'clarificationCapability'
    | 'hallucinationControl';
  title: string;
  passedCount: number;
  totalCount: number;
  passRate: number;
  summary: string;
}

export interface EvaluationCaseBenchmark {
  id: string;
  title: string;
  prompt: string;
  expectedHazardKeywords: string[];
  expectedRegulationHints: string[];
  expectedClarificationHints: string[];
  riskRuleCheck: {
    hazardName: string;
    probability: number;
    severity: number;
    expectedScore: number;
    expectedLevel: RiskLevel;
  };
}

export interface EvaluationCaseResult {
  caseId: string;
  title: string;
  prompt: string;
  executedAt: string;
  model: string;
  durationMs: number;
  toolNamesUsed: AgentToolName[];
  referenceSourceCount: number;
  replyExcerpt: string;
  clarificationQuestionsCount: number;
  checks: {
    hazardCompleteness: boolean;
    regulationAccuracy: boolean;
    sourceTraceability: boolean;
    riskCalculationAccuracy: boolean;
    clarificationCapability: boolean;
    hallucinationControl: boolean;
  };
  notes: string[];
}

export interface EvaluationReportResponse {
  hasExecutedRun: boolean;
  executedAt: string | null;
  model: string | null;
  benchmarkCases: EvaluationCaseBenchmark[];
  criteriaMetrics: EvaluationCriterionMetric[];
  caseResults: EvaluationCaseResult[];
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

export type KnowledgeEntryType = 'regulation' | 'guideline';

export interface KnowledgeArticle {
  id: string;
  title: string;
  type: KnowledgeEntryType;
  category: KnowledgeCategory;
  summary: string;
  keyPoints: string[];
  applicableScenarios: string[];
  contentMarkdown: string;
  keywords: string[];
  source: ReferenceSourceItem;
}

export interface KnowledgeSearchResponse {
  items: KnowledgeArticle[];
  total: number;
  categories: KnowledgeCategory[];
}

export type AccidentCaseIndustry =
  | '製造業'
  | '營造業'
  | '化學工業'
  | '倉儲與運輸業'
  | '公用事業與設備維護';

export type AccidentCaseHazardType =
  | '墜落、滾落'
  | '感電'
  | '被夾、被捲'
  | '物體飛落'
  | '火災與爆炸'
  | '有害物接觸'
  | '缺氧窒息'
  | '物體倒塌、崩塌';

export interface AccidentCaseCauses {
  direct: string[];
  indirect: string[];
  basic: string[];
}

export interface AccidentCaseItem {
  id: string;
  title: string;
  industry: AccidentCaseIndustry;
  hazardType: AccidentCaseHazardType;
  medium: string;
  summary: string;
  incidentDescription: string;
  causes: AccidentCaseCauses;
  preventiveMeasures: string[];
  relatedRegulations: string[];
  keywords: string[];
  source: ReferenceSourceItem;
}

export interface AccidentCaseSearchResponse {
  items: AccidentCaseItem[];
  total: number;
  industries: AccidentCaseIndustry[];
  hazardTypes: AccidentCaseHazardType[];
}

export interface HazardControlHierarchy {
  eliminationOrSubstitution: string[];
  engineeringControls: string[];
  administrativeControls: string[];
  ppe: string[];
}

export interface HazardCatalogItem {
  id: string;
  hazardType: AccidentCaseHazardType;
  category: KnowledgeCategory;
  description: string;
  typicalScenarios: string[];
  potentialConsequences: string[];
  controlHierarchy: HazardControlHierarchy;
  relatedLawRefs: string[];
  source: ReferenceSourceItem;
}

export interface HazardCatalogResponse {
  items: HazardCatalogItem[];
  total: number;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export * from './risk-matrix';
