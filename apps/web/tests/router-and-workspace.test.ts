import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/router';
import { useSystemStore } from '@/stores/system';
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
    const wrapper = mount(WorkspaceView);

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

  it('submits scenario to Live Agent when enabled and renders structured analysis, tool traces, and citations', async () => {
    const store = useSystemStore();
    store.config = {
      agentEnabled: true,
      demoEnabled: false,
      knowledgeBaseEnabled: true,
      version: '0.1.0',
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
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
          },
          toolTraces: [
            {
              id: 'call_1',
              toolName: 'search_safety_knowledge',
              executionStatus: 'completed',
              executionDurationMs: 4,
              inputSummary: 'query=第57條',
              outputSummary: '檢索到 1 筆知識條目',
              referenceSources: [],
            },
          ],
          referenceSources: [
            {
              title: '全國法規資料庫－職業安全衛生設施規則（pcode=N0060013）',
              publisher: '勞動部／法務部全國法規資料庫',
              officialUrl: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0060013',
              updatedAt: '2026-06-30',
              citationSummary: '第57條機械維修停機上鎖規定。',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = mount(WorkspaceView);
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
});
