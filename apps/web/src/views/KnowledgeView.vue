<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type {
  HazardCatalogItem,
  KnowledgeArticle,
  KnowledgeCategory,
  KnowledgeEntryType,
} from '@safeagent/shared';
import {
  BookOpen,
  Calendar,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { ApiClientError } from '@/services/api-client';
import { fetchHazards, fetchKnowledgeArticles } from '@/services/knowledge.service';

type ViewMode = 'articles' | 'hazards';

const categories: KnowledgeCategory[] = [
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
];

const viewMode = ref<ViewMode>('articles');
const searchQuery = ref('');
const selectedCategory = ref<KnowledgeCategory | '全部'>('全部');
const selectedEntryType = ref<KnowledgeEntryType | ''>('');

const articles = ref<KnowledgeArticle[]>([]);
const hazards = ref<HazardCatalogItem[]>([]);
const selectedArticleId = ref<string | null>(null);
const selectedHazardId = ref<string | null>(null);

const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
let activeController: AbortController | null = null;

const selectedArticle = computed<KnowledgeArticle | null>(() => {
  if (!articles.value.length) return null;
  return articles.value.find((item) => item.id === selectedArticleId.value) ?? articles.value[0];
});

const selectedHazard = computed<HazardCatalogItem | null>(() => {
  if (!hazards.value.length) return null;
  return hazards.value.find((item) => item.id === selectedHazardId.value) ?? hazards.value[0];
});

const totalCount = computed<number>(() =>
  viewMode.value === 'articles' ? articles.value.length : hazards.value.length,
);

function getEntryTypeLabel(type: KnowledgeEntryType): string {
  return type === 'regulation' ? '法規標準' : '官方指引';
}

async function loadKnowledge(): Promise<void> {
  if (activeController) {
    activeController.abort();
  }
  const controller = new AbortController();
  activeController = controller;

  isLoading.value = true;
  errorMessage.value = null;

  try {
    if (viewMode.value === 'articles') {
      const response = await fetchKnowledgeArticles(
        {
          query: searchQuery.value,
          category: selectedCategory.value,
          type: selectedEntryType.value || undefined,
        },
        undefined,
        controller.signal,
      );
      articles.value = response.items;
      selectedArticleId.value = response.items[0]?.id ?? null;
    } else {
      const response = await fetchHazards(
        {
          query: searchQuery.value,
          category: selectedCategory.value,
        },
        undefined,
        controller.signal,
      );
      hazards.value = response.items;
      selectedHazardId.value = response.items[0]?.id ?? null;
    }
  } catch (err) {
    if (err instanceof ApiClientError && err.code === 'REQUEST_ABORTED') {
      return;
    }
    errorMessage.value =
      err instanceof ApiClientError
        ? `${err.message}（請確認後端 Worker API 是否已啟動）`
        : '載入職安知識庫失敗';
    articles.value = [];
    hazards.value = [];
  } finally {
    if (activeController === controller) {
      isLoading.value = false;
      activeController = null;
    }
  }
}

function selectCategory(cat: KnowledgeCategory | '全部'): void {
  selectedCategory.value = cat;
  void loadKnowledge();
}

function selectViewMode(mode: ViewMode): void {
  viewMode.value = mode;
  void loadKnowledge();
}

function selectEntryType(type: KnowledgeEntryType | ''): void {
  selectedEntryType.value = type;
  if (viewMode.value !== 'articles') {
    viewMode.value = 'articles';
  }
  void loadKnowledge();
}

function resetFilters(): void {
  searchQuery.value = '';
  selectedCategory.value = '全部';
  selectedEntryType.value = '';
  void loadKnowledge();
}

onMounted(() => {
  void loadKnowledge();
});

onBeforeUnmount(() => {
  activeController?.abort();
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">職安知識庫（Knowledge Base）</h2>
          <StatusBadge label="Day 2 已啟用・官方來源已查證" tone="success" />
        </div>
        <p class="text-sm text-[#64748B]">
          收錄全國法規資料庫與勞動部職業安全衛生署之公開法規重點、實務指引及危害控制階層，所有條目皆附可追溯來源與查證更新日期。
        </p>
      </div>

      <!-- Mode Switch -->
      <div class="inline-flex rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-1 shrink-0" role="tablist" aria-label="知識庫檢視模式">
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'articles'"
          data-testid="tab-articles"
          class="px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
          :class="
            viewMode === 'articles'
              ? 'bg-[#0F766E] text-white'
              : 'text-[#475569] hover:text-[#1E293B]'
          "
          @click="selectViewMode('articles')"
        >
          法規與官方指引
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="viewMode === 'hazards'"
          data-testid="tab-hazards"
          class="px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer"
          :class="
            viewMode === 'hazards'
              ? 'bg-[#0F766E] text-white'
              : 'text-[#475569] hover:text-[#1E293B]'
          "
          @click="selectViewMode('hazards')"
        >
          危害分類與控制階層
        </button>
      </div>
    </section>

    <!-- Search & Category Filter -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <form class="flex items-center gap-3" @submit.prevent="loadKnowledge">
        <div class="relative flex-1">
          <Search class="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            v-model="searchQuery"
            data-testid="knowledge-search-input"
            type="text"
            aria-label="搜尋職安知識關鍵字"
            placeholder="輸入關鍵字（例如：第57條、LOTO、2公尺、局限空間、安全帶、SDS）"
            class="w-full rounded-md border border-[#CBD5E1] pl-9 pr-4 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          data-testid="knowledge-search-btn"
          class="px-4 py-2 rounded-md bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0D655E] transition-colors cursor-pointer"
        >
          搜尋知識庫
        </button>
        <button
          type="button"
          data-testid="knowledge-reset-btn"
          class="px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
          @click="resetFilters"
        >
          重設
        </button>
      </form>

      <div v-if="viewMode === 'articles'" class="flex items-center gap-2">
        <span class="text-xs font-semibold text-[#475569] mr-1">資料類型：</span>
        <button
          type="button"
          class="px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer"
          :class="
            selectedEntryType === ''
              ? 'bg-[#1E293B] text-white border-[#1E293B]'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          "
          @click="selectEntryType('')"
        >
          全部類型
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer"
          :class="
            selectedEntryType === 'regulation'
              ? 'bg-[#1E293B] text-white border-[#1E293B]'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          "
          @click="selectEntryType('regulation')"
        >
          法規標準
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer"
          :class="
            selectedEntryType === 'guideline'
              ? 'bg-[#1E293B] text-white border-[#1E293B]'
              : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
          "
          @click="selectEntryType('guideline')"
        >
          官方指引
        </button>
      </div>

      <div class="space-y-2">
        <div class="text-xs font-semibold text-[#475569]">知識分類</div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer"
            :class="
              selectedCategory === '全部'
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
            "
            @click="selectCategory('全部')"
          >
            全部分類
          </button>
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer"
            :class="
              selectedCategory === cat
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
            "
            @click="selectCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </section>

    <!-- Error / Offline State -->
    <section
      v-if="errorMessage"
      data-testid="knowledge-error-state"
      class="bg-white border border-red-200 rounded-lg p-8 text-center space-y-3"
    >
      <div class="text-sm font-semibold text-[#DC2626]">{{ errorMessage }}</div>
      <p class="text-xs text-[#64748B]">
        為確保資料來源可追溯性，前端不硬編未連線時之離線假資料。啟動後端 API 後即可恢復即時檢索。
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] cursor-pointer"
        @click="loadKnowledge"
      >
        <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
        <span>重新連線查詢</span>
      </button>
    </section>

    <!-- Loading State -->
    <section
      v-else-if="isLoading"
      class="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center text-sm text-[#64748B]"
    >
      正在查詢職安知識庫資料...
    </section>

    <!-- Empty Result State -->
    <section
      v-else-if="totalCount === 0"
      data-testid="knowledge-empty-state"
      class="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center space-y-2"
    >
      <div class="text-sm font-medium text-[#1E293B]">找不到符合條件的職安知識條目</div>
      <p class="text-xs text-[#64748B]">請嘗試調整搜尋關鍵字，或重設分類篩選條件。</p>
      <button
        type="button"
        class="mt-2 px-3 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#0F766E] hover:bg-teal-50 cursor-pointer"
        @click="resetFilters"
      >
        顯示全部知識條目
      </button>
    </section>

    <!-- Articles Master-Detail View -->
    <div v-else-if="viewMode === 'articles'" class="grid grid-cols-12 gap-6 items-start">
      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <BookOpen class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>文章列表（共 {{ articles.length }} 筆）</span>
          </h3>
          <span class="text-xs text-[#64748B]">分類：{{ selectedCategory }}</span>
        </div>

        <ul class="space-y-3" data-testid="knowledge-article-list">
          <li v-for="article in articles" :key="article.id">
            <button
              type="button"
              :data-testid="`knowledge-item-${article.id}`"
              class="w-full text-left rounded-md border p-4 transition-colors cursor-pointer space-y-2"
              :class="
                selectedArticle?.id === article.id
                  ? 'border-[#0F766E] bg-teal-50/40'
                  : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
              "
              @click="selectedArticleId = article.id"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-[#334155]">
                    {{ getEntryTypeLabel(article.type) }}
                  </span>
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200">
                    {{ article.category }}
                  </span>
                </div>
                <span class="text-[11px] text-[#64748B] flex items-center gap-1">
                  <Calendar class="h-3 w-3" aria-hidden="true" />
                  <span>{{ article.source.updatedAt }}</span>
                </span>
              </div>
              <div class="text-sm font-semibold text-[#1E293B]">{{ article.title }}</div>
              <p class="text-xs text-[#475569] leading-relaxed line-clamp-2">{{ article.summary }}</p>
              <div class="text-[11px] text-[#64748B]">來源機關：{{ article.source.publisher }}</div>
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="selectedArticle"
        data-testid="knowledge-detail-panel"
        class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5 sticky top-6"
      >
        <div class="space-y-2 border-b border-[#E2E8F0] pb-4">
          <div class="flex items-center gap-2">
            <StatusBadge :label="getEntryTypeLabel(selectedArticle.type)" tone="neutral" :show-dot="false" />
            <StatusBadge :label="selectedArticle.category" tone="success" :show-dot="false" />
          </div>
          <h3 class="text-base font-semibold text-[#1E293B]">{{ selectedArticle.title }}</h3>
          <p class="text-xs text-[#475569] leading-relaxed">{{ selectedArticle.summary }}</p>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <FileText class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>核心法條與實務重點</span>
          </h4>
          <ul class="space-y-2">
            <li
              v-for="(point, idx) in selectedArticle.keyPoints"
              :key="idx"
              class="text-xs text-[#334155] leading-relaxed bg-[#F8FAFC] border border-[#E2E8F0] rounded px-3 py-2"
            >
              {{ point }}
            </li>
          </ul>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <Tag class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>對應作業情境</span>
          </h4>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="scenario in selectedArticle.applicableScenarios"
              :key="scenario"
              class="px-2.5 py-1 rounded bg-slate-100 text-[#334155] text-[11px]"
            >
              {{ scenario }}
            </span>
          </div>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
          <div class="text-xs font-semibold text-[#1E293B]">官方來源與可追溯資訊</div>
          <dl class="space-y-1 text-xs">
            <div class="flex justify-between gap-4">
              <dt class="text-[#64748B] shrink-0">資料標題</dt>
              <dd class="text-[#1E293B] text-right">{{ selectedArticle.source.title }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#64748B] shrink-0">發布機關</dt>
              <dd class="text-[#1E293B] text-right">{{ selectedArticle.source.publisher }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-[#64748B] shrink-0">修正／查證日期</dt>
              <dd class="font-mono text-[#1E293B]">{{ selectedArticle.source.updatedAt }}</dd>
            </div>
          </dl>
          <p class="text-[11px] text-[#475569] leading-relaxed pt-1">
            {{ selectedArticle.source.citationSummary }}
          </p>
          <a
            :href="selectedArticle.source.officialUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline pt-1"
          >
            <span>前往官方資料來源查閱全文</span>
            <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>

    <!-- Hazards Master-Detail View -->
    <div v-else class="grid grid-cols-12 gap-6 items-start">
      <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <ShieldAlert class="h-4 w-4 text-[#D97706]" aria-hidden="true" />
            <span>危害類型清單（共 {{ hazards.length }} 類）</span>
          </h3>
        </div>

        <ul class="space-y-2.5" data-testid="hazard-catalog-list">
          <li v-for="hazard in hazards" :key="hazard.id">
            <button
              type="button"
              class="w-full text-left rounded-md border p-4 transition-colors cursor-pointer space-y-1.5"
              :class="
                selectedHazard?.id === hazard.id
                  ? 'border-[#0F766E] bg-teal-50/40'
                  : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
              "
              @click="selectedHazardId = hazard.id"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-[#1E293B]">{{ hazard.hazardType }}</span>
                <span class="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200">
                  {{ hazard.category }}
                </span>
              </div>
              <p class="text-xs text-[#475569] leading-relaxed">{{ hazard.description }}</p>
            </button>
          </li>
        </ul>
      </section>

      <section
        v-if="selectedHazard"
        class="col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5"
      >
        <div class="border-b border-[#E2E8F0] pb-4 space-y-1.5">
          <div class="flex items-center gap-2">
            <StatusBadge :label="selectedHazard.hazardType" tone="warning" :show-dot="false" />
            <StatusBadge :label="selectedHazard.category" tone="neutral" :show-dot="false" />
          </div>
          <p class="text-xs text-[#475569] leading-relaxed">{{ selectedHazard.description }}</p>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
            <div class="text-xs font-semibold text-[#1E293B]">常見作業情境</div>
            <ul class="space-y-1 text-xs text-[#475569]">
              <li v-for="s in selectedHazard.typicalScenarios" :key="s">· {{ s }}</li>
            </ul>
          </div>
          <div class="rounded-md border border-red-200 bg-red-50/50 p-4 space-y-2">
            <div class="text-xs font-semibold text-[#DC2626]">潛在嚴重後果</div>
            <ul class="space-y-1 text-xs text-[#475569]">
              <li v-for="c in selectedHazard.potentialConsequences" :key="c">· {{ c }}</li>
            </ul>
          </div>
        </div>

        <div class="space-y-2.5">
          <div class="text-xs font-semibold text-[#1E293B]">風險控制階層（Hierarchy of Controls）</div>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="rounded border border-[#E2E8F0] p-3 space-y-1">
              <div class="font-semibold text-[#0F766E]">1. 消除與替代</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="item in selectedHazard.controlHierarchy.eliminationOrSubstitution" :key="item">
                  · {{ item }}
                </li>
              </ul>
            </div>
            <div class="rounded border border-[#E2E8F0] p-3 space-y-1">
              <div class="font-semibold text-[#0F766E]">2. 工程控制</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="item in selectedHazard.controlHierarchy.engineeringControls" :key="item">
                  · {{ item }}
                </li>
              </ul>
            </div>
            <div class="rounded border border-[#E2E8F0] p-3 space-y-1">
              <div class="font-semibold text-[#0F766E]">3. 行政管理</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="item in selectedHazard.controlHierarchy.administrativeControls" :key="item">
                  · {{ item }}
                </li>
              </ul>
            </div>
            <div class="rounded border border-[#E2E8F0] p-3 space-y-1">
              <div class="font-semibold text-[#0F766E]">4. 個人防護具（PPE）</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="item in selectedHazard.controlHierarchy.ppe" :key="item">
                  · {{ item }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-center justify-between gap-4">
          <div class="space-y-1 text-xs">
            <div class="font-semibold text-[#1E293B]">依據法規與來源：{{ selectedHazard.source.publisher }}</div>
            <div class="text-[#64748B]">相關法條：{{ selectedHazard.relatedLawRefs.join('、') }}</div>
          </div>
          <a
            :href="selectedHazard.source.officialUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline shrink-0"
          >
            <span>官方來源</span>
            <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  </div>
</template>
