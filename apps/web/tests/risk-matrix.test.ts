import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRiskAssessmentRecord, calculateRiskGrade } from '@safeagent/shared';
import RiskMatrixView from '@/views/RiskMatrixView.vue';

describe('Day 4 5x5 Risk Matrix Rules & View', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calculates deterministic 5x5 risk levels accurately', () => {
    const low = calculateRiskGrade(1, 5);
    expect(low.score).toBe(5);
    expect(low.riskLevel).toBe('low');

    const medium = calculateRiskGrade(2, 3);
    expect(medium.score).toBe(6);
    expect(medium.riskLevel).toBe('medium');

    const high = calculateRiskGrade(3, 5);
    expect(high.score).toBe(15);
    expect(high.riskLevel).toBe('high');
    expect(high.acceptability).toBe('unacceptable');
  });

  it('requires user confirmation before building a risk assessment record', () => {
    expect(() =>
      buildRiskAssessmentRecord({
        hazardName: '墜落',
        scenarioTitle: '測試',
        initialProbability: 4,
        initialSeverity: 5,
        controlsApplied: ['安全帶'],
        userConfirmed: false,
      }),
    ).toThrow();
  });

  it('blocks unconfirmed submission in RiskMatrixView and records confirmed assessment + generates Markdown report', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'risk-1',
          hazardName: '屋頂高處墜落',
          scenarioTitle: '廠區頂樓排氣風車維修',
          initialRisk: calculateRiskGrade(4, 5),
          residualRisk: calculateRiskGrade(2, 3),
          controlsApplied: ['安全母索', '安全帶'],
          userConfirmed: true,
          evaluatedAt: '2026-11-26T09:45:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = mount(RiskMatrixView);

    await wrapper.get('[data-testid="risk-hazard-input"]').setValue('屋頂高處墜落');
    await wrapper.get('[data-testid="matrix-cell-4-5"]').trigger('click');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('[data-testid="risk-form-error"]').text()).toContain('請先勾選確認');
    expect(mockFetch).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="user-confirmed-checkbox"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="risk-records-table"]').text()).toContain('屋頂高處墜落');
    expect(wrapper.get('[data-testid="risk-records-table"]').text()).toContain('4×5=20');

    await wrapper.get('[data-testid="generate-risk-report-btn"]').trigger('click');
    await flushPromises();
    expect(wrapper.get('[data-testid="risk-report-preview"]').text()).toContain(
      'SafeAgent 初步危害辨識與風險評估報告',
    );
  });
});
