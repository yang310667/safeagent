import type { AgentToolName, AgentToolTraceItem, ReferenceSourceItem } from '@safeagent/shared';
import {
  searchAccidentCases,
  searchHazards,
  searchKnowledgeArticles,
} from '../services/knowledge.service';

export interface OpenAIResponsesToolDefinition {
  type: 'function';
  name: AgentToolName;
  description: string;
  parameters: Record<string, unknown>;
}

export const DAY3_AGENT_TOOLS: OpenAIResponsesToolDefinition[] = [
  {
    type: 'function',
    name: 'search_safety_knowledge',
    description:
      '檢索 SafeAgent 官方職業安全衛生知識庫（含全國法規資料庫條文重點與勞動部職安署公開指引）。引用任何法條或指引前必須先呼叫此工具查證。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜尋關鍵字，例如：第57條、LOTO、高架作業、2公尺、局限空間、SDS',
        },
        category: {
          type: 'string',
          description:
            '知識分類（選填）：職安基礎、職業安全衛生法規、危害辨識、風險評估、製程安全、機械安全、電氣安全、高處作業、化學品安全、智慧工安',
        },
        type: {
          type: 'string',
          enum: ['regulation', 'guideline'],
          description: '資料類型（選填）：regulation 或 guideline',
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'search_accident_cases',
    description:
      '檢索勞動部職業安全衛生署公開職業災害案例摘要，了解同類作業或設備之事故經過、原因分析與防災對策。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜尋關鍵字，例如：屋頂、採光罩、馬達、感電、輸送帶、氯氣、未斷電',
        },
        industry: {
          type: 'string',
          description: '產業分類（選填）：製造業、營造業、化學工業、倉儲與運輸業、公用事業與設備維護',
        },
        hazardType: {
          type: 'string',
          description:
            '危害類型（選填）：墜落、滾落、感電、被夾、被捲、物體飛落、火災與爆炸、有害物接觸、缺氧窒息、物體倒塌、崩塌',
        },
      },
      required: ['query'],
    },
  },
  {
    type: 'function',
    name: 'identify_hazards',
    description:
      '依作業情境檢索官方危害類型目錄與風險控制階層（消除/替代、工程控制、行政管理、PPE）及對應法規依據。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '作業或危害關鍵字，例如：墜落、感電、被夾、化學品、局限空間、倒塌',
        },
        category: {
          type: 'string',
          description: '對應知識分類（選填）',
        },
      },
      required: ['query'],
    },
  },
];

export interface ToolExecutionResult {
  outputJson: string;
  traceItem: AgentToolTraceItem;
  sources: ReferenceSourceItem[];
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

function formatInputSummary(args: Record<string, unknown>): string {
  const entries = Object.entries(args)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => `${key}=${String(value).trim()}`);
  return entries.length > 0 ? entries.join(', ') : '（無指定篩選參數）';
}

function parseArguments(rawArgs: string): Record<string, unknown> {
  if (!rawArgs.trim()) return {};
  try {
    const parsed = JSON.parse(rawArgs) as unknown;
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function executeSafetyTool(
  toolName: string,
  rawArgs: string,
  callId: string,
): ToolExecutionResult {
  const startedAt = Date.now();
  const args = parseArguments(rawArgs);
  const query = typeof args.query === 'string' ? args.query : '';
  const category = typeof args.category === 'string' ? args.category : undefined;
  const inputSummary = formatInputSummary(args);

  if (toolName === 'search_safety_knowledge') {
    const type = typeof args.type === 'string' ? args.type : undefined;
    let result = searchKnowledgeArticles({ query, category, type });
    let broadened = false;
    if (result.total === 0 && (category || type)) {
      result = searchKnowledgeArticles({ query });
      broadened = result.total > 0;
    }
    const topItems = result.items.slice(0, 5).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      category: item.category,
      summary: item.summary,
      keyPoints: item.keyPoints,
      source: item.source,
    }));
    const sources = deduplicateSources(topItems.map((item) => item.source));

    return {
      outputJson: JSON.stringify({ totalMatched: result.total, items: topItems }),
      sources,
      traceItem: {
        id: callId,
        toolName: 'search_safety_knowledge',
        executionStatus: 'completed',
        executionDurationMs: Math.max(1, Date.now() - startedAt),
        inputSummary,
        outputSummary:
          topItems.length > 0
            ? `檢索到 ${result.total} 筆知識條目（回傳前 ${topItems.length} 筆${broadened ? '，已自動放寬分類篩選' : ''}）`
            : '查無符合條件之知識條目',
        referenceSources: sources,
      },
    };
  }

  if (toolName === 'search_accident_cases') {
    const industry = typeof args.industry === 'string' ? args.industry : undefined;
    const hazardType = typeof args.hazardType === 'string' ? args.hazardType : undefined;
    let result = searchAccidentCases({ query, industry, hazardType });
    let broadened = false;
    if (result.total === 0 && (industry || hazardType)) {
      result = searchAccidentCases({ query });
      broadened = result.total > 0;
    }
    const topItems = result.items.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      industry: item.industry,
      hazardType: item.hazardType,
      medium: item.medium,
      summary: item.summary,
      causes: item.causes,
      preventiveMeasures: item.preventiveMeasures,
      relatedRegulations: item.relatedRegulations,
      source: item.source,
    }));
    const sources = deduplicateSources(topItems.map((item) => item.source));

    return {
      outputJson: JSON.stringify({ totalMatched: result.total, items: topItems }),
      sources,
      traceItem: {
        id: callId,
        toolName: 'search_accident_cases',
        executionStatus: 'completed',
        executionDurationMs: Math.max(1, Date.now() - startedAt),
        inputSummary,
        outputSummary:
          topItems.length > 0
            ? `檢索到 ${result.total} 筆公開職災案例（回傳前 ${topItems.length} 筆${broadened ? '，已自動放寬產業或危害篩選' : ''}）`
            : '查無符合條件之職災案例',
        referenceSources: sources,
      },
    };
  }

  if (toolName === 'identify_hazards') {
    let result = searchHazards({ query, category });
    let broadened = false;
    if (result.total === 0 && category) {
      result = searchHazards({ query });
      broadened = result.total > 0;
    }
    const items = result.items.slice(0, 5);
    const sources = deduplicateSources(items.map((item) => item.source));

    return {
      outputJson: JSON.stringify({ totalMatched: result.total, items }),
      sources,
      traceItem: {
        id: callId,
        toolName: 'identify_hazards',
        executionStatus: 'completed',
        executionDurationMs: Math.max(1, Date.now() - startedAt),
        inputSummary,
        outputSummary:
          items.length > 0
            ? `比對到 ${result.total} 類危害控制階層項目${broadened ? '（已自動放寬分類篩選）' : ''}`
            : '未比對到特定危害目錄項目',
        referenceSources: sources,
      },
    };
  }

  const validUnknownTool: AgentToolName = 'search_safety_knowledge';
  return {
    outputJson: JSON.stringify({
      error: `不支援的工具名稱：${toolName}`,
    }),
    sources: [],
    traceItem: {
      id: callId,
      toolName: validUnknownTool,
      executionStatus: 'failed',
      executionDurationMs: Math.max(1, Date.now() - startedAt),
      inputSummary: `unknown tool=${toolName}, ${inputSummary}`,
      outputSummary: `工具 ${toolName} 未註冊`,
      referenceSources: [],
    },
  };
}
