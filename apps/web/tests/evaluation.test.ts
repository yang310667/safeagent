import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EvaluationView from '@/views/EvaluationView.vue';

describe('Day 6 EvaluationView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders benchmark criteria metrics and case results from /api/evaluation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            hasExecutedRun: true,
            executedAt: '2026-11-26T10:10:00.000Z',
            model: 'gpt-4.1-mini',
            benchmarkCases: [
              {
                id: 'eval-case-1-exhaust-fan',
                title: '廠區頂樓排氣風車維修作業',
                prompt: '測試提示詞',
                expectedHazardKeywords: ['墜落'],
                expectedRegulationHints: ['職業安全衛生法'],
                expectedClarificationHints: ['高度'],
                riskRuleCheck: {
                  hazardName: '墜落',
                  probability: 4,
                  severity: 5,
                  expectedScore: 20,
                  expectedLevel: 'high',
                },
              },
            ],
            criteriaMetrics: [
              {
                key: 'hazardCompleteness',
                title: '危害辨識完整性',
                passedCount: 1,
                totalCount: 1,
                passRate: 100,
                summary: '實測 1/1 筆通過（100%）',
              },
            ],
            caseResults: [
              {
                caseId: 'eval-case-1-exhaust-fan',
                title: '廠區頂樓排氣風車維修作業',
                prompt: '測試提示詞',
                executedAt: '2026-11-26T10:10:00.000Z',
                model: 'gpt-4.1-mini',
                durationMs: 1200,
                toolNamesUsed: ['search_safety_knowledge'],
                referenceSourceCount: 2,
                replyExcerpt: '已檢索相關職安法規。',
                clarificationQuestionsCount: 3,
                checks: {
                  hazardCompleteness: true,
                  regulationAccuracy: true,
                  sourceTraceability: true,
                  riskCalculationAccuracy: true,
                  clarificationCapability: true,
                  hallucinationControl: true,
                },
                notes: ['六項評估指標皆通過實測檢核'],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const wrapper = mount(EvaluationView);
    await flushPromises();

    expect(wrapper.get('[data-testid="evaluation-criteria-grid"]').text()).toContain('100% (1/1)');
    expect(wrapper.get('[data-testid="evaluation-case-list"]').text()).toContain('通過 6/6 項');
  });

  it('shows graceful offline notice when evaluation API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const wrapper = mount(EvaluationView);
    await flushPromises();

    expect(wrapper.get('[data-testid="evaluation-error-state"]').text()).toContain(
      '無法連線至後端服務',
    );
  });
});
