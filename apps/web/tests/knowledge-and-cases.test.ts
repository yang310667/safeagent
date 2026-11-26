import { createPinia, setActivePinia } from 'pinia';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '@/services/api-client';
import { fetchAccidentCases } from '@/services/accident-cases.service';
import { fetchHazards, fetchKnowledgeArticles } from '@/services/knowledge.service';
import AccidentCasesView from '@/views/AccidentCasesView.vue';
import KnowledgeView from '@/views/KnowledgeView.vue';

describe('Day 2 Knowledge Base & Accident Cases Services and Views', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds query parameters cleanly for knowledge, hazards, and accident cases services', async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ items: [], total: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    vi.stubGlobal('fetch', mockFetch);
    const client = new ApiClient('http://localhost:8787');

    await fetchKnowledgeArticles({ query: '第57條', category: '機械安全', type: 'regulation' }, client);
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8787/api/knowledge?q=%E7%AC%AC57%E6%A2%9D&category=%E6%A9%9F%E6%A2%B0%E5%AE%89%E5%85%A8&type=regulation',
      expect.objectContaining({ method: 'GET' }),
    );

    await fetchHazards({ category: '全部', query: '墜落' }, client);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8787/api/hazards?q=%E5%A2%9C%E8%90%BD',
      expect.objectContaining({ method: 'GET' }),
    );

    await fetchAccidentCases({ industry: '化學工業', hazardType: '有害物接觸' }, client);
    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      'http://localhost:8787/api/accident-cases?industry=%E5%8C%96%E5%AD%B8%E5%B7%A5%E6%A5%AD&hazardType=%E6%9C%89%E5%AE%B3%E7%89%A9%E6%8E%A5%E8%A7%B8',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('renders knowledge articles and citations in KnowledgeView', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: 'reg-osh-act-overview',
              title: '職業安全衛生法',
              type: 'regulation',
              category: '職業安全衛生法規',
              summary: '我國職業安全衛生之母法。',
              keyPoints: ['第6條規定雇主應設必要安全衛生設備及措施。'],
              applicableScenarios: ['高處作業'],
              contentMarkdown: '### 重點',
              keywords: ['第6條'],
              source: {
                title: '全國法規資料庫－職業安全衛生法',
                publisher: '勞動部／法務部全國法規資料庫',
                officialUrl: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=N0060001',
                updatedAt: '2025-12-19',
                citationSummary: '依據全國法規資料庫整理。',
              },
            },
          ],
          total: 1,
          categories: ['職業安全衛生法規'],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const wrapper = mount(KnowledgeView);
    await flushPromises();

    expect(wrapper.get('[data-testid="knowledge-article-list"]').text()).toContain('職業安全衛生法');
    expect(wrapper.get('[data-testid="knowledge-detail-panel"]').text()).toContain(
      '勞動部／法務部全國法規資料庫',
    );
    expect(wrapper.get('[data-testid="knowledge-detail-panel"]').text()).toContain('2025-12-19');
  });

  it('shows graceful error state in AccidentCasesView when backend is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const wrapper = mount(AccidentCasesView);
    await flushPromises();

    expect(wrapper.get('[data-testid="cases-error-state"]').text()).toContain('無法連線至後端服務');
  });
});
