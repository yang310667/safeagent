import type {
  KnowledgeCategory,
  LearningPlanItem,
  LearningPlanRequest,
  LearningPlanResponse,
} from '@safeagent/shared';
import { searchAccidentCases, searchKnowledgeArticles } from '../services/knowledge.service';
import {
  AgentServiceError,
  callResponsesApi,
  DEFAULT_OPENAI_MODEL,
  extractOutputText,
} from './responses-client';

const STUDY_PLAN_INSTRUCTIONS = `你是 SafeAgent 的職業安全衛生「自主學習規劃助手」。
請根據學習者提供的學習目標、每週可用時數、規劃週數、重點分類與已完成主題，搭配下方提供的 SafeAgent 官方知識庫與公開職災案例清單，安排循序漸進的每週自主學習計畫。

請嚴格遵守：
1. 僅可推薦真實存在的台灣職安法規／指引或下方知識庫清單內之參考資料，不可編造不存在的法規名稱或課程經歷。
2. 全程使用繁體中文（台灣）。
3. 每週安排應包含：學習主題、學習目標（objectives）、建議研讀之知識庫或官方來源（recommendedSources）、可帶入 SafeAgent AI 工作台練習的情境提示詞（practicePrompt），以及預估學習時數（estimatedHours）。
4. 明確標示本計畫為「AI 建議之待執行學習規劃」，不是已完成之課程心得。`;

const STUDY_PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['planTitle', 'weeklySchedule', 'studyAdvice', 'disclaimer'],
  properties: {
    planTitle: { type: 'string' },
    weeklySchedule: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'weekLabel',
          'topic',
          'category',
          'objectives',
          'recommendedSources',
          'practicePrompt',
          'estimatedHours',
        ],
        properties: {
          weekLabel: { type: 'string' },
          topic: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              '職安基礎',
              '職業安全衛生法規',
              '危害辨識',
              '風險評估',
              '製程安全',
              '機械安全',
              '電氣安全',
              '高處作業',
              '化學品安全',
              '智慧工安',
            ],
          },
          objectives: { type: 'array', items: { type: 'string' } },
          recommendedSources: { type: 'array', items: { type: 'string' } },
          practicePrompt: { type: 'string' },
          estimatedHours: { type: 'number' },
        },
      },
    },
    studyAdvice: { type: 'string' },
    disclaimer: { type: 'string' },
  },
};

export interface GenerateLearningPlanOptions {
  apiKey: string;
  model?: string;
  request: LearningPlanRequest;
  fetchImpl?: typeof fetch;
}

export async function generateAiLearningPlan(
  options: GenerateLearningPlanOptions,
): Promise<LearningPlanResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolvedModel = options.model?.trim() || DEFAULT_OPENAI_MODEL;

  const kbCatalog = searchKnowledgeArticles().items.map((item) => ({
    title: item.title,
    category: item.category,
    publisher: item.source.publisher,
  }));
  const caseCatalog = searchAccidentCases().items.map((c) => ({
    title: c.title,
    hazardType: c.hazardType,
  }));

  const userPrompt = JSON.stringify(
    {
      learnerRequest: options.request,
      availableKnowledgeBase: kbCatalog,
      availableAccidentCases: caseCatalog,
    },
    null,
    2,
  );

  const response = await callResponsesApi(
    options.apiKey,
    {
      model: resolvedModel,
      instructions: STUDY_PLAN_INSTRUCTIONS,
      input: userPrompt,
      text: {
        format: {
          type: 'json_schema',
          name: 'safeagent_learning_plan',
          strict: true,
          schema: STUDY_PLAN_SCHEMA,
        },
      },
    },
    fetchImpl,
  );

  const rawText = extractOutputText(response);
  if (!rawText.trim()) {
    throw new AgentServiceError(502, 'OPENAI_EMPTY_RESPONSE', 'OpenAI API 未回傳有效學習規劃');
  }

  try {
    const parsed = JSON.parse(rawText) as {
      planTitle?: string;
      weeklySchedule?: Array<Partial<LearningPlanItem>>;
      studyAdvice?: string;
      disclaimer?: string;
    };

    const schedule: LearningPlanItem[] = Array.isArray(parsed.weeklySchedule)
      ? parsed.weeklySchedule.map((item, idx) => ({
          weekLabel: item.weekLabel || `第 ${idx + 1} 週`,
          topic: item.topic || '職業安全衛生自主學習',
          category: (item.category || '職安基礎') as KnowledgeCategory,
          objectives: Array.isArray(item.objectives) ? item.objectives : [],
          recommendedSources: Array.isArray(item.recommendedSources)
            ? item.recommendedSources
            : [],
          practicePrompt: item.practicePrompt || '',
          estimatedHours:
            typeof item.estimatedHours === 'number' && item.estimatedHours > 0
              ? item.estimatedHours
              : options.request.weeklyHours,
        }))
      : [];

    return {
      planTitle: parsed.planTitle || 'SafeAgent 個人化職安自主學習規劃',
      model: response.model || resolvedModel,
      generatedAt: new Date().toISOString(),
      weeklySchedule: schedule,
      studyAdvice: parsed.studyAdvice || '',
      disclaimer:
        parsed.disclaimer ||
        '本規劃為 AI 建議之待執行學習參考，並非已完成之正式訓練紀錄或認證資格。',
    };
  } catch {
    throw new AgentServiceError(502, 'OPENAI_INVALID_OUTPUT', '學習規劃回傳格式不符合 JSON 規範');
  }
}
