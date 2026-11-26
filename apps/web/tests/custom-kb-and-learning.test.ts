import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '@/router';
import { useKnowledgeStore } from '@/stores/knowledge';
import { useSystemStore } from '@/stores/system';
import { parseMarkdownOrTextContent } from '@/utils/document-parser';
import KnowledgeView from '@/views/KnowledgeView.vue';
import LearningLogView from '@/views/LearningLogView.vue';

describe('Custom Knowledge Import & AI Learning Planner', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses Markdown file content into structured draft fields', () => {
    const draft = parseMarkdownOrTextContent(
      '# 廠區有機溶劑通風規範\n- 作業前應啟動局部排氣裝置\n- 確認 SDS 相容性與防毒面具濾毒罐效期',
      'solvent-guide.md',
    );
    expect(draft.title).toBe('廠區有機溶劑通風規範');
    expect(draft.suggestedCategory).toBe('化學品安全');
    expect(draft.keyPoints.length).toBe(2);
  });

  it('allows adding custom knowledge entries in KnowledgeView and stores them in Pinia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ items: [], total: 0, categories: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const wrapper = mount(KnowledgeView);
    await flushPromises();

    await wrapper.get('[data-testid="toggle-add-knowledge-btn"]').trigger('click');
    await wrapper.get('[data-testid="kb-title-input"]').setValue('自訂堆高機作業指引');
    await wrapper.get('[data-testid="kb-summary-input"]').setValue('倉庫堆高機行駛速限與裝卸安全重點。');
    await wrapper.get('[data-testid="kb-publisher-input"]').setValue('勞動部職安署宣導手冊');
    await wrapper.get('[data-testid="kb-url-input"]').setValue('https://www.osha.gov.tw/');
    await wrapper.get('[data-testid="add-knowledge-panel"] form').trigger('submit');
    await flushPromises();

    const kbStore = useKnowledgeStore();
    expect(kbStore.customArticles).toHaveLength(1);
    expect(wrapper.get('[data-testid="knowledge-article-list"]').text()).toContain('自訂堆高機作業指引');
    expect(wrapper.get('[data-testid="knowledge-article-list"]').text()).toContain('使用者擴充');
  });

  it('generates AI study plan and records manual completed learning log in LearningLogView', async () => {
    const systemStore = useSystemStore();
    systemStore.config = {
      agentEnabled: true,
      demoEnabled: false,
      knowledgeBaseEnabled: true,
      version: '0.1.0',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            planTitle: '職安管理員預習 4 週計畫',
            model: 'gpt-4.1-mini',
            generatedAt: '2026-11-26T11:30:00.000Z',
            weeklySchedule: [
              {
                weekLabel: '第 1 週',
                topic: '職業安全衛生法基本義務',
                category: '職業安全衛生法規',
                objectives: ['理解第6條與承攬管理第26、27條'],
                recommendedSources: ['全國法規資料庫 N0060001'],
                practicePrompt: '分析承攬商進廠維修風車之危害告知重點',
                estimatedHours: 5,
              },
            ],
            studyAdvice: '每週結合案例分析加深理解。',
            disclaimer: '此為 AI 建議待執行計畫，非已完成紀錄。',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const wrapper = mount(LearningLogView, {
      global: { plugins: [createAppRouter()] },
    });

    await wrapper.get('[data-testid="ai-planner-section"] form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-testid="ai-plan-output"]').text()).toContain('職安管理員預習 4 週計畫');
    expect(wrapper.get('[data-testid="ai-plan-output"]').text()).toContain('第 1 週｜職業安全衛生法基本義務');

    await wrapper.get('[data-testid="log-topic-input"]').setValue('研讀高架作業勞工保護措施標準');
    await wrapper.get('[data-testid="log-reflection-input"]').setValue('整理 2 公尺與 5 公尺定義及休息時間規定。');
    await wrapper.get('[data-testid="save-learning-log-btn"]').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[data-testid="learning-log-list"]').text()).toContain('研讀高架作業勞工保護措施標準');
  });
});
