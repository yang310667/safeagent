import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRiskAssessmentRecord, calculateRiskGrade } from '@safeagent/shared';
import { useRiskStore } from '@/stores/risk';
import RiskMatrixView from '@/views/RiskMatrixView.vue';
import RiskRecordsView from '@/views/RiskRecordsView.vue';

describe('Day 4 5x5 Risk Matrix Rules & View', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
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

  it('persists records with custom names and allows renaming and deleting in RiskRecordsView', async () => {
    const store = useRiskStore();
    store.addRecord(
      buildRiskAssessmentRecord(
        {
          recordName: 'A棟頂樓初評',
          hazardName: '屋頂高處墜落',
          scenarioTitle: '廠區頂樓排氣風車維修',
          initialProbability: 4,
          initialSeverity: 5,
          controlsApplied: ['安全母索', '安全帶'],
          residualProbability: 2,
          residualSeverity: 3,
          userConfirmed: true,
        },
        'risk-rec-1',
      ),
    );

    // Verify localStorage persistence across fresh Pinia instance
    setActivePinia(createPinia());
    const reloadedStore = useRiskStore();
    expect(reloadedStore.records).toHaveLength(1);
    expect(reloadedStore.records[0]?.recordName).toBe('A棟頂樓初評');

    const wrapper = mount(RiskRecordsView);
    expect(wrapper.get('[data-testid="saved-record-title"]').text()).toBe('A棟頂樓初評');

    // Rename record inline
    await wrapper.get('[data-testid="rename-record-btn"]').trigger('click');
    await wrapper.get('[data-testid="rename-record-input"]').setValue('B棟廠房複評版本');
    await wrapper.get('[data-testid="save-record-name-btn"]').trigger('click');

    expect(wrapper.get('[data-testid="saved-record-title"]').text()).toBe('B棟廠房複評版本');
    expect(reloadedStore.records[0]?.recordName).toBe('B棟廠房複評版本');

    // Click topic card to view detail with 5x5 matrix chart and NO bar chart
    await wrapper.get('[data-testid="saved-record-item"]').trigger('click');
    expect(wrapper.find('[data-testid="record-detail-view"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="detail-record-title"]').text()).toBe('B棟廠房複評版本');
    expect(wrapper.find('[data-testid="echarts-matrix-container"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="echarts-bar-container"]').exists()).toBe(false);

    // Return to topic list and delete record
    await wrapper.get('[data-testid="back-to-records-list-btn"]').trigger('click');
    expect(wrapper.find('[data-testid="record-detail-view"]').exists()).toBe(false);

    await wrapper.get('[data-testid="delete-record-btn"]').trigger('click');
    expect(reloadedStore.records).toHaveLength(0);
    expect(wrapper.find('[data-testid="risk-records-page-empty"]').exists()).toBe(true);
  });
});
