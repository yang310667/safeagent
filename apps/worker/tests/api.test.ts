import type {
  AccidentCaseItem,
  AccidentCaseSearchResponse,
  AgentChatResponse,
  ApiErrorResponse,
  ConfigResponse,
  EvaluationCaseResult,
  EvaluationReportResponse,
  HazardCatalogResponse,
  HealthResponse,
  KnowledgeArticle,
  KnowledgeSearchResponse,
  PreliminarySafetyReport,
  RiskAssessmentRecord,
} from '@safeagent/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/index';
import { executeSafetyTool } from '../src/tools/safety-tools';

const defaultEnv = {
  APP_VERSION: '0.1.0',
  AGENT_ENABLED: 'false',
  ALLOWED_ORIGINS: 'http://localhost:5173,https://example.github.io',
  OPENAI_API_KEY: 'sk-test-secret-should-never-appear',
};

describe('SafeAgent Worker API', () => {
  const app = createApp();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/health returns service status and ISO-8601 timestamp', async () => {
    const res = await app.request('/api/health', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-Id')).toBeTruthy();

    const data = (await res.json()) as HealthResponse;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('safeagent-worker');
    expect(data.version).toBe('0.1.0');
    expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false);
  });

  it('GET /api/config returns public feature flags without exposing secrets', async () => {
    const res = await app.request('/api/config', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);

    const rawText = await res.text();
    expect(rawText).not.toContain('sk-test-secret');
    expect(rawText).not.toContain('OPENAI_API_KEY');

    const data = JSON.parse(rawText) as ConfigResponse;
    expect(data).toEqual({
      agentEnabled: false,
      demoEnabled: false,
      knowledgeBaseEnabled: true,
      version: '0.1.0',
    });
  });

  it('GET /api/knowledge returns verified entries with source traceability and supports filtering', async () => {
    const res = await app.request('/api/knowledge', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);

    const data = (await res.json()) as KnowledgeSearchResponse;
    expect(data.total).toBeGreaterThanOrEqual(10);
    expect(data.items.length).toBe(data.total);
    for (const item of data.items) {
      expect(item.source.publisher).toBeTruthy();
      expect(item.source.officialUrl).toMatch(/^https:\/\//);
      expect(item.source.updatedAt).toBeTruthy();
    }

    const filteredRes = await app.request(
      '/api/knowledge?q=第57條&category=機械安全&type=regulation',
      { method: 'GET' },
      defaultEnv,
    );
    expect(filteredRes.status).toBe(200);
    const filteredData = (await filteredRes.json()) as KnowledgeSearchResponse;
    expect(filteredData.total).toBe(1);
    expect(filteredData.items[0].id).toBe('reg-osh-facilities-mechanical-electrical');
  });

  it('GET /api/knowledge/:id returns detail or unified 404 JSON', async () => {
    const okRes = await app.request('/api/knowledge/reg-osh-act-overview', { method: 'GET' }, defaultEnv);
    expect(okRes.status).toBe(200);
    const article = (await okRes.json()) as KnowledgeArticle;
    expect(article.id).toBe('reg-osh-act-overview');

    const notFoundRes = await app.request('/api/knowledge/does-not-exist', { method: 'GET' }, defaultEnv);
    expect(notFoundRes.status).toBe(404);
    const err = (await notFoundRes.json()) as ApiErrorResponse;
    expect(err.error.code).toBe('KNOWLEDGE_NOT_FOUND');
    expect(err.requestId).toBeTruthy();
  });

  it('GET /api/hazards returns structured hazard catalog', async () => {
    const res = await app.request('/api/hazards?category=高處作業', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as HazardCatalogResponse;
    expect(data.total).toBe(1);
    expect(data.items[0].hazardType).toBe('墜落、滾落');
  });

  it('GET /api/accident-cases returns public OSHA cases and supports industry/hazard/query filters', async () => {
    const res = await app.request('/api/accident-cases', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);
    const data = (await res.json()) as AccidentCaseSearchResponse;
    expect(data.total).toBe(6);
    for (const item of data.items) {
      expect(item.source.publisher).toBe('勞動部職業安全衛生署');
      expect(item.source.officialUrl).toMatch(/^https:\/\//);
      expect(item.causes.direct.length).toBeGreaterThan(0);
      expect(item.preventiveMeasures.length).toBeGreaterThan(0);
    }

    const filteredRes = await app.request(
      '/api/accident-cases?industry=化學工業&hazardType=有害物接觸&q=氯氣',
      { method: 'GET' },
      defaultEnv,
    );
    expect(filteredRes.status).toBe(200);
    const filtered = (await filteredRes.json()) as AccidentCaseSearchResponse;
    expect(filtered.total).toBe(1);
    expect(filtered.items[0].id).toBe('case-chemical-piping-misconnection');

    const detailRes = await app.request(
      '/api/accident-cases/case-roof-skylight-fall',
      { method: 'GET' },
      defaultEnv,
    );
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as AccidentCaseItem;
    expect(detail.medium).toContain('採光罩');

    const notFoundRes = await app.request('/api/accident-cases/missing', { method: 'GET' }, defaultEnv);
    expect(notFoundRes.status).toBe(404);
    const err = (await notFoundRes.json()) as ApiErrorResponse;
    expect(err.error.code).toBe('ACCIDENT_CASE_NOT_FOUND');
  });

  it('POST /api/agent/chat returns HTTP 503 AGENT_DISABLED when AGENT_ENABLED is false', async () => {
    const res = await app.request(
      '/api/agent/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '請協助分析排氣風車維修作業的潛在危害',
          conversationId: null,
        }),
      },
      defaultEnv,
    );

    expect(res.status).toBe(503);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error.code).toBe('AGENT_DISABLED');
    expect(data.requestId).toBeTruthy();
  });

  it('POST /api/agent/chat returns HTTP 503 AGENT_NOT_CONFIGURED when OPENAI_API_KEY is missing', async () => {
    const res = await app.request(
      '/api/agent/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '請協助分析排氣風車維修作業的潛在危害',
          conversationId: null,
        }),
      },
      {
        ...defaultEnv,
        AGENT_ENABLED: 'true',
        OPENAI_API_KEY: '',
      },
    );

    expect(res.status).toBe(503);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error.code).toBe('AGENT_NOT_CONFIGURED');
  });

  it('POST /api/agent/chat runs OpenAI Responses API tool calling loop and returns structured analysis without exposing secrets', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp_round_1',
            model: 'gpt-4.1-mini',
            output: [
              {
                type: 'function_call',
                call_id: 'call_kb_1',
                name: 'search_safety_knowledge',
                arguments: JSON.stringify({ query: '第57條' }),
              },
              {
                type: 'function_call',
                call_id: 'call_haz_1',
                name: 'identify_hazards',
                arguments: JSON.stringify({ query: '墜落' }),
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp_round_2',
            model: 'gpt-4.1-mini',
            output_text: JSON.stringify({
              reply: '已檢索機械安全與高處防墜規定，建議作業前先執行停機上鎖與防墜措施。',
              scenarioSummary: '廠區頂樓排氣風車維修涉及高處作業與旋轉機械維修。',
              identifiedHazards: [
                {
                  hazardType: '墜落、滾落',
                  description: '頂樓邊緣或採光罩周邊作業具墜落風險。',
                  potentialConsequence: '人員自高處墜落造成重傷或死亡。',
                  recommendedControls: ['設置護欄或安全母索', '佩戴全身背負式安全帶'],
                  relatedRegulations: ['職業安全衛生設施規則第224條、第281條'],
                },
              ],
              clarificationQuestions: ['作業高度是否達 2 公尺以上？', '主電源是否已完成 LOTO 上鎖掛牌？'],
              recommendedActions: ['切斷總電源並上鎖掛牌（第57條）', '架設安全母索並使用安全帶'],
              limitationsNotice: '本結果僅供研究與學習輔助參考，非正式作業安全許可。',
            }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', mockFetch);

    const enabledEnv = {
      ...defaultEnv,
      AGENT_ENABLED: 'true',
      OPENAI_MODEL: 'gpt-4.1-mini',
    };

    const configRes = await app.request('/api/config', { method: 'GET' }, enabledEnv);
    const configData = (await configRes.json()) as ConfigResponse;
    expect(configData.agentEnabled).toBe(true);

    const chatRes = await app.request(
      '/api/agent/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '廠區頂樓排氣風車維修作業',
          conversationId: 'resp_prev_0',
        }),
      },
      enabledEnv,
    );

    expect(chatRes.status).toBe(200);
    const rawText = await chatRes.text();
    expect(rawText).not.toContain('sk-test-secret');

    const chatData = JSON.parse(rawText) as AgentChatResponse;
    expect(chatData.conversationId).toBe('resp_round_2');
    expect(chatData.model).toBe('gpt-4.1-mini');
    expect(chatData.toolTraces).toHaveLength(2);
    expect(chatData.toolTraces[0].toolName).toBe('search_safety_knowledge');
    expect(chatData.toolTraces[1].toolName).toBe('identify_hazards');
    expect(chatData.referenceSources.length).toBeGreaterThan(0);
    expect(chatData.analysis.clarificationQuestions).toHaveLength(2);

    const firstCallInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const firstBody = JSON.parse(String(firstCallInit.body)) as Record<string, unknown>;
    expect(firstBody.previous_response_id).toBe('resp_prev_0');

    const secondCallInit = mockFetch.mock.calls[1]?.[1] as RequestInit;
    const secondBody = JSON.parse(String(secondCallInit.body)) as Record<string, unknown>;
    expect(secondBody.previous_response_id).toBe('resp_round_1');
    expect(Array.isArray(secondBody.input)).toBe(true);
  });

  it('POST /api/agent/chat validates missing message with HTTP 400', async () => {
    const res = await app.request(
      '/api/agent/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', conversationId: null }),
      },
      defaultEnv,
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error.code).toBe('INVALID_REQUEST');
  });

  it('enforces CORS allowlist for allowed and disallowed origins', async () => {
    const allowedRes = await app.request(
      '/api/health',
      {
        method: 'GET',
        headers: { Origin: 'http://localhost:5173' },
      },
      defaultEnv,
    );
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');

    const githubPagesRes = await app.request(
      '/api/health',
      {
        method: 'GET',
        headers: { Origin: 'https://example.github.io' },
      },
      defaultEnv,
    );
    expect(githubPagesRes.status).toBe(200);
    expect(githubPagesRes.headers.get('Access-Control-Allow-Origin')).toBe('https://example.github.io');

    const disallowedRes = await app.request(
      '/api/health',
      {
        method: 'GET',
        headers: { Origin: 'https://evil.example.com' },
      },
      defaultEnv,
    );
    expect(disallowedRes.status).toBe(200);
    expect(disallowedRes.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const preflightAllowed = await app.request(
      '/api/agent/chat',
      {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      },
      defaultEnv,
    );
    expect(preflightAllowed.status).toBe(204);
    expect(preflightAllowed.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');

    const preflightDisallowed = await app.request(
      '/api/agent/chat',
      {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example.com' },
      },
      defaultEnv,
    );
    expect(preflightDisallowed.status).toBe(403);
    expect(preflightDisallowed.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns unified 404 JSON for unknown routes', async () => {
    const res = await app.request('/api/unknown-route', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(404);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.requestId).toBeTruthy();
  });

  it('POST /api/risk/calculate enforces user confirmation and computes initial + residual 5x5 risk grades', async () => {
    const unconfirmedRes = await app.request(
      '/api/risk/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazardName: '屋頂高處墜落',
          scenarioTitle: '頂樓排氣風車維修',
          initialProbability: 4,
          initialSeverity: 5,
          controlsApplied: ['安全母索', '全身背負式安全帶'],
          userConfirmed: false,
        }),
      },
      defaultEnv,
    );
    expect(unconfirmedRes.status).toBe(400);
    const err = (await unconfirmedRes.json()) as ApiErrorResponse;
    expect(err.error.code).toBe('USER_CONFIRMATION_REQUIRED');

    const okRes = await app.request(
      '/api/risk/calculate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazardName: '屋頂高處墜落',
          scenarioTitle: '頂樓排氣風車維修',
          initialProbability: 4,
          initialSeverity: 5,
          controlsApplied: ['鋪設防踏穿踏板', '安全母索與全身背負式安全帶'],
          residualProbability: 2,
          residualSeverity: 3,
          userConfirmed: true,
        }),
      },
      defaultEnv,
    );
    expect(okRes.status).toBe(200);
    const record = (await okRes.json()) as RiskAssessmentRecord;
    expect(record.initialRisk.score).toBe(20);
    expect(record.initialRisk.riskLevel).toBe('high');
    expect(record.residualRisk?.score).toBe(6);
    expect(record.residualRisk?.riskLevel).toBe('medium');
  });

  it('POST /api/risk/report generates structured Markdown report with PoC disclaimer', async () => {
    const res = await app.request(
      '/api/risk/report',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle: '頂樓排氣風車維修',
          scenarioSummary: '高處作業搭配斷電上鎖',
          hazards: [
            {
              hazardType: '墜落、滾落',
              description: '鄰近屋頂邊緣作業',
              potentialConsequence: '高處墜落重傷',
              recommendedControls: ['安全母索', '安全帶'],
              relatedRegulations: ['職業安全衛生設施規則第281條'],
            },
          ],
          recommendedActions: ['確認風速後再作業'],
        }),
      },
      defaultEnv,
    );
    expect(res.status).toBe(200);
    const report = (await res.json()) as PreliminarySafetyReport;
    expect(report.markdownContent).toContain('# SafeAgent 初步危害辨識與風險評估報告');
    expect(report.markdownContent).toContain('不得取代合格職業安全衛生人員');
  });

  it('calculate_risk tool blocks unconfirmed scores and calculates confirmed risk deterministically', () => {
    const blocked = executeSafetyTool(
      'calculate_risk',
      JSON.stringify({
        hazardName: '感電危害',
        probability: 4,
        severity: 5,
        userConfirmedConditions: false,
      }),
      'call_unconfirmed',
    );
    expect(JSON.parse(blocked.outputJson).status).toBe('NEEDS_USER_CONFIRMATION');

    const calculated = executeSafetyTool(
      'calculate_risk',
      JSON.stringify({
        hazardName: '感電危害',
        probability: 4,
        severity: 5,
        residualProbability: 1,
        residualSeverity: 4,
        userConfirmedConditions: true,
      }),
      'call_confirmed',
    );
    const parsed = JSON.parse(calculated.outputJson);
    expect(parsed.status).toBe('CALCULATED');
    expect(parsed.initialRisk.score).toBe(20);
    expect(parsed.initialRisk.riskLevel).toBe('high');
    expect(parsed.residualRisk.score).toBe(4);
    expect(parsed.residualRisk.riskLevel).toBe('low');
  });

  it('POST /api/agent/chat/stream emits real SSE status, tool.started, tool.completed, message.delta, and message.completed events with CORS headers', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp_sse_1',
            model: 'gpt-4.1-mini',
            output: [
              {
                type: 'function_call',
                call_id: 'call_sse_kb',
                name: 'search_safety_knowledge',
                arguments: JSON.stringify({ query: '第57條' }),
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp_sse_2',
            model: 'gpt-4.1-mini',
            output_text: JSON.stringify({
              reply: '已完成 SSE 工具呼叫分析。',
              scenarioSummary: '機械維修停機上鎖檢查',
              identifiedHazards: [],
              clarificationQuestions: ['是否已上鎖掛牌？'],
              recommendedActions: ['執行 LOTO'],
              limitationsNotice: '研究概念驗證用途。',
              preliminaryReportMarkdown: '',
            }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', mockFetch);

    const res = await app.request(
      '/api/agent/chat/stream',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify({
          message: '機械設備維修作業',
          conversationId: null,
        }),
      },
      {
        ...defaultEnv,
        AGENT_ENABLED: 'true',
      },
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');

    const bodyText = await res.text();
    expect(bodyText).toContain('event: agent.status');
    expect(bodyText).toContain('event: tool.started');
    expect(bodyText).toContain('event: tool.completed');
    expect(bodyText).toContain('event: message.delta');
    expect(bodyText).toContain('event: message.completed');
    expect(bodyText).not.toContain('sk-test-secret');
  });

  it('GET /api/evaluation returns benchmark suite and POST /api/evaluation/run scores an Agent turn', async () => {
    const evalRes = await app.request('/api/evaluation', { method: 'GET' }, defaultEnv);
    expect(evalRes.status).toBe(200);
    const evalData = (await evalRes.json()) as EvaluationReportResponse;
    expect(evalData.benchmarkCases).toHaveLength(5);
    expect(evalData.criteriaMetrics).toHaveLength(6);

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp_eval_1',
            model: 'gpt-4.1-mini',
            output: [
              {
                type: 'function_call',
                call_id: 'call_eval_kb',
                name: 'search_safety_knowledge',
                arguments: JSON.stringify({ query: '屋頂' }),
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'resp_eval_2',
            model: 'gpt-4.1-mini',
            output_text: JSON.stringify({
              reply: '依職業安全衛生法及職業安全衛生設施規則，屋頂高處作業具墜落風險。',
              scenarioSummary: '頂樓排氣風車維修作業',
              identifiedHazards: [
                {
                  hazardType: '墜落、滾落',
                  description: '屋頂高處作業墜落風險',
                  potentialConsequence: '嚴重傷亡',
                  recommendedControls: ['安全母索', '全身安全帶'],
                  relatedRegulations: ['職業安全衛生法', '職業安全衛生設施規則'],
                },
              ],
              clarificationQuestions: ['作業高度是否超過 2 公尺？'],
              recommendedActions: ['確認上鎖掛牌與防墜設施'],
              limitationsNotice: 'PoC 輔助分析。',
              preliminaryReportMarkdown: '',
            }),
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', mockFetch);

    const runRes = await app.request(
      '/api/evaluation/run',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'eval-case-1-exhaust-fan' }),
      },
      { ...defaultEnv, AGENT_ENABLED: 'true' },
    );
    expect(runRes.status).toBe(200);
    const caseResult = (await runRes.json()) as EvaluationCaseResult;
    expect(caseResult.caseId).toBe('eval-case-1-exhaust-fan');
    expect(caseResult.checks.hazardCompleteness).toBe(true);
    expect(caseResult.checks.regulationAccuracy).toBe(true);
    expect(caseResult.checks.sourceTraceability).toBe(true);
    expect(caseResult.checks.riskCalculationAccuracy).toBe(true);
    expect(caseResult.checks.clarificationCapability).toBe(true);
    expect(caseResult.checks.hallucinationControl).toBe(true);
  });
});
