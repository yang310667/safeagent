import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/router';
import { useSystemStore } from '@/stores/system';
import GuideView from '@/views/GuideView.vue';
import WorkspaceView from '@/views/WorkspaceView.vue';

describe('Router Navigation & Workspace Interaction', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('navigates across all defined application routes using Hash History', async () => {
    const router = createAppRouter();
    const expectedPaths = [
      '/',
      '/guide',
      '/workspace',
      '/risk-matrix',
      '/knowledge',
      '/accident-cases',
      '/learning-log',
      '/evaluation',
      '/future-research',
      '/about',
    ];

    for (const path of expectedPaths) {
      await router.push(path);
      await router.isReady();
      expect(router.currentRoute.value.path).toBe(path);
      expect(router.currentRoute.value.meta.title).toBeTruthy();
    }
  });

  it('fills workspace input when clicking a preset scenario and keeps submit disabled', async () => {
    const router = createAppRouter();
    const wrapper = mount(WorkspaceView, {
      global: { plugins: [router] },
    });

    const submitBtn = wrapper.get('[data-testid="submit-workspace-btn"]');
    expect(submitBtn.attributes('disabled')).toBeDefined();

    const scenarioBtn = wrapper.get('[data-testid="scenario-btn-exhaust-fan-maintenance"]');
    await scenarioBtn.trigger('click');

    const textarea = wrapper.get('[data-testid="workspace-input"]');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('廠區頂樓');
    expect((textarea.element as HTMLTextAreaElement).value).toContain('排氣風車');

    const clearBtn = wrapper.get('[data-testid="clear-workspace-btn"]');
    await clearBtn.trigger('click');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
  });

  it('streams SSE events to WorkspaceView when enabled and renders structured analysis, tool traces, and citations', async () => {
    const store = useSystemStore();
    store.config = {
      agentEnabled: true,
      demoEnabled: false,
      knowledgeBaseEnabled: true,
      version: '0.1.0',
    };

    const ssePayload = [
      `event: agent.status\ndata: ${JSON.stringify({
        event: 'agent.status',
        data: { stage: 'calling_tools', message: '正在呼叫工具...', round: 1 },
        timestamp: '2026-11-26T09:55:00.000Z',
      })}\n\n`,
      `event: tool.started\ndata: ${JSON.stringify({
        event: 'tool.started',
        data: { id: 'call_1', toolName: 'search_safety_knowledge', inputSummary: 'query=第57條' },
        timestamp: '2026-11-26T09:55:00.100Z',
      })}\n\n`,
      `event: tool.completed\ndata: ${JSON.stringify({
        event: 'tool.completed',
        data: {
          trace: {
            id: 'call_1',
            toolName: 'search_safety_knowledge',
            executionStatus: 'completed',
            executionDurationMs: 4,
            inputSummary: 'query=第57條',
            outputSummary: '檢索到 1 筆知識條目',
            referenceSources: [
              {
                title: '全國法規資料庫－職業安全衛生設施規則（pcode=N0060013）',
                publisher: '勞動部／法務部全國法規資料庫',
                officialUrl: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0060013',
                updatedAt: '2026-06-30',
                citationSummary: '第57條機械維修停機上鎖規定。',
              },
            ],
          },
        },
        timestamp: '2026-11-26T09:55:00.200Z',
      })}\n\n`,
      `event: message.delta\ndata: ${JSON.stringify({
        event: 'message.delta',
        data: { text: '已完成初篩，請補充作業高度與停機上鎖狀態。' },
        timestamp: '2026-11-26T09:55:00.300Z',
      })}\n\n`,
      `event: message.completed\ndata: ${JSON.stringify({
        event: 'message.completed',
        data: {
          response: {
            conversationId: 'resp_live_1',
            reply: '已完成初篩，請補充作業高度與停機上鎖狀態。',
            model: 'gpt-4.1-mini',
            analysis: {
              scenarioSummary: '頂樓排氣風車維修作業',
              identifiedHazards: [
                {
                  hazardType: '被夾、被捲',
                  description: '風車傳動皮帶與葉輪維修時有誤啟動捲夾風險。',
                  potentialConsequence: '造成肢體捲入或嚴重創傷。',
                  recommendedControls: ['執行停機、切斷電源並上鎖掛牌（LOTO）'],
                  relatedRegulations: ['職業安全衛生設施規則第57條'],
                },
              ],
              clarificationQuestions: ['主電源開關是否已完成上鎖掛牌？'],
              recommendedActions: ['作業前確認葉輪完全靜止並上鎖掛牌'],
              limitationsNotice: '僅供研究概念驗證（PoC）參考，非正式作業安全許可。',
              preliminaryReportMarkdown: '',
            },
            toolTraces: [],
            referenceSources: [],
          },
        },
        timestamp: '2026-11-26T09:55:00.400Z',
      })}\n\n`,
    ].join('');

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload));
        controller.close();
      },
    });

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      }),
    );
    vi.stubGlobal('fetch', mockFetch);

    const router = createAppRouter();
    const wrapper = mount(WorkspaceView, {
      global: { plugins: [router] },
    });
    await wrapper.get('[data-testid="scenario-btn-exhaust-fan-maintenance"]').trigger('click');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="workspace-messages"]').text()).toContain(
      '已完成初篩，請補充作業高度與停機上鎖狀態。',
    );
    expect(wrapper.get('[data-testid="clarification-panel"]').text()).toContain(
      '主電源開關是否已完成上鎖掛牌？',
    );
    expect(wrapper.get('[data-testid="analysis-report-panel"]').text()).toContain('被夾、被捲');
    expect(wrapper.get('[data-testid="trace-list"]').text()).toContain('search_safety_knowledge');
    expect(wrapper.get('[data-testid="reference-source-list"]').text()).toContain('2026-06-30');
  });

  it('renders GuideView usage examples and prefills WorkspaceView when clicking try button', async () => {
    const router = createAppRouter();
    await router.push('/guide');
    await router.isReady();

    const guideWrapper = mount(GuideView, {
      global: { plugins: [router] },
    });
    expect(guideWrapper.get('[data-testid="guide-examples-list"]').text()).toContain(
      '範例 1｜廠區頂樓排氣風車維修',
    );
    await guideWrapper.get('[data-testid="try-example-guide-ex-1"]').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/workspace');

    const workspaceWrapper = mount(WorkspaceView, {
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(
      (workspaceWrapper.get('[data-testid="workspace-input"]').element as HTMLTextAreaElement).value,
    ).toContain('廠區頂樓');
  });
});
