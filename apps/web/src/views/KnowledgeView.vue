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
  Download,
  ExternalLink,
  FileText,
  FileUp,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Tag,
  Trash2,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { ApiClientError } from '@/services/api-client';
import { fetchHazards, fetchKnowledgeArticles } from '@/services/knowledge.service';
import { useKnowledgeStore } from '@/stores/knowledge';
import { parseUploadedKnowledgeFile } from '@/utils/document-parser';

type ViewMode = 'articles' | 'hazards';

const knowledgeStore = useKnowledgeStore();

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

const builtInArticles = ref<KnowledgeArticle[]>([]);
const hazards = ref<HazardCatalogItem[]>([]);
const selectedArticleId = ref<string | null>(null);
const selectedHazardId = ref<string | null>(null);

const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
let activeController: AbortController | null = null;

// Import / Create Custom Knowledge State
const showAddPanel = ref(false);
const isParsingFile = ref(false);
const parseStatusMessage = ref<string | null>(null);
const formError = ref<string | null>(null);

const formTitle = ref('');
const formType = ref<KnowledgeEntryType>('guideline');
const formCategory = ref<KnowledgeCategory>('職安基礎');
const formSummary = ref('');
const formKeyPoints = ref('');
const formContentMarkdown = ref('');
const formPublisher = ref('');
const formOfficialUrl = ref('');
const formUpdatedAt = ref(new Date().toISOString().slice(0, 10));

function matchesLocalFilter(article: KnowledgeArticle): boolean {
  if (selectedCategory.value !== '全部' && article.category !== selectedCategory.value) {
    return false;
  }
  if (selectedEntryType.value && article.type !== selectedEntryType.value) {
    return false;
  }
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return true;
  const terms = q.split(/\s+/).filter(Boolean);
  const combined = [
    article.title,
    article.category,
    article.summary,
    article.contentMarkdown,
    ...article.keyPoints,
    ...article.keywords,
    article.source.publisher,
  ]
    .join(' ')
    .toLowerCase();
  return terms.some((term) => combined.includes(term));
}

const articles = computed<KnowledgeArticle[]>(() => {
  const customFiltered = knowledgeStore.customArticles.filter(matchesLocalFilter);
  return [...customFiltered, ...builtInArticles.value];
});

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

async function handleFileUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  isParsingFile.value = true;
  parseStatusMessage.value = null;
  formError.value = null;

  try {
    const result = await parseUploadedKnowledgeFile(file);
    if (result.importedArticles) {
      result.importedArticles.forEach((item) => {
        knowledgeStore.addCustomArticle({
          ...item,
          id: item.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        });
      });
      parseStatusMessage.value = `已直接從 JSON 匯入 ${result.importedArticles.length} 筆知識條目！`;
      selectedArticleId.value = result.importedArticles[0]?.id ?? null;
    } else if (result.draft) {
      formTitle.value = result.draft.title;
      formType.value = result.draft.suggestedType;
      formCategory.value = result.draft.suggestedCategory;
      formSummary.value = result.draft.summary;
      formKeyPoints.value = result.draft.keyPoints.join('\n');
      formContentMarkdown.value = result.draft.contentMarkdown;
      if (!formPublisher.value.trim()) {
        formPublisher.value = '使用者匯入文件（待標註官方機關）';
      }
      if (!formOfficialUrl.value.trim()) {
        formOfficialUrl.value = 'https://www.osha.gov.tw/';
      }
      parseStatusMessage.value = `已解析「${file.name}」（共 ${result.draft.contentMarkdown.length} 字元），請確認來源與分類後按下「加入知識庫」。`;
    }
  } catch (err) {
    formError.value = err instanceof Error ? err.message : '解析匯入檔案失敗';
  } finally {
    isParsingFile.value = false;
    input.value = '';
  }
}

function handleSaveCustomArticle(): void {
  formError.value = null;
  if (!formTitle.value.trim() || !formSummary.value.trim()) {
    formError.value = '請填寫知識標題與內容摘要。';
    return;
  }
  if (!formPublisher.value.trim() || !formOfficialUrl.value.trim()) {
    formError.value = '依據來源可追溯原則，請填寫發布機關與來源網址。';
    return;
  }

  const keyPoints = formKeyPoints.value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const newArticle: KnowledgeArticle = {
    id: `custom-${Date.now()}`,
    title: formTitle.value.trim(),
    type: formType.value,
    category: formCategory.value,
    summary: formSummary.value.trim(),
    keyPoints: keyPoints.length > 0 ? keyPoints : [formSummary.value.trim()],
    applicableScenarios: ['使用者擴充知識情境'],
    contentMarkdown: formContentMarkdown.value.trim() || formSummary.value.trim(),
    keywords: [formTitle.value.trim(), formCategory.value],
    source: {
      title: formTitle.value.trim(),
      publisher: formPublisher.value.trim(),
      officialUrl: formOfficialUrl.value.trim(),
      updatedAt: formUpdatedAt.value || new Date().toISOString().slice(0, 10),
      citationSummary: `使用者匯入／補充之知識庫文件（${formPublisher.value.trim()}）。`,
    },
  };

  knowledgeStore.addCustomArticle(newArticle);
  selectedArticleId.value = newArticle.id;
  showAddPanel.value = false;
  parseStatusMessage.value = null;

  formTitle.value = '';
  formSummary.value = '';
  formKeyPoints.value = '';
  formContentMarkdown.value = '';
  formPublisher.value = '';
  formOfficialUrl.value = '';
}

function handleExportCustomJson(): void {
  if (knowledgeStore.customArticles.length === 0) return;
  const blob = new Blob([JSON.stringify(knowledgeStore.customArticles, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `safeagent-custom-knowledge-${Date.now()}.json`;
  link.click();
  URL.revokeObjectURL(url);
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
      builtInArticles.value = response.items;
      if (!selectedArticleId.value || !articles.value.some((a) => a.id === selectedArticleId.value)) {
        selectedArticleId.value = articles.value[0]?.id ?? null;
      }
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
    builtInArticles.value = [];
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
          <StatusBadge label="支援 PDF / MD 擴充匯入" tone="success" />
          <StatusBadge
            v-if="knowledgeStore.customArticles.length > 0"
            :label="`已擴充 ${knowledgeStore.customArticles.length} 筆`"
            tone="primary"
            :show-dot="false"
          />
        </div>
        <p class="text-sm text-[#64748B]">
          收錄全國法規資料庫與勞動部職業安全衛生署公開條文，並可匯入 <code>.pdf</code>、<code>.md</code>、<code>.txt</code> 或 <code>.json</code> 文件擴充知識量，匯入後將同步供 AI 工作台檢索引用。
        </p>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          data-testid="toggle-add-knowledge-btn"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] transition-colors cursor-pointer"
          @click="showAddPanel = !showAddPanel"
        >
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ showAddPanel ? '收合匯入面板' : '新增 / 匯入 PDF・MD' }}</span>
        </button>

        <button
          v-if="knowledgeStore.customArticles.length > 0"
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:bg-slate-50 cursor-pointer"
          @click="handleExportCustomJson"
        >
          <Download class="h-3.5 w-3.5" aria-hidden="true" />
          <span>匯出擴充 JSON</span>
        </button>

        <!-- Mode Switch -->
        <div class="inline-flex rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-1" role="tablist" aria-label="知識庫檢視模式">
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
            法規與指引
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
            危害控制階層
          </button>
        </div>
      </div>
    </section>

    <!-- Custom Knowledge Import / Add Panel -->
    <section
      v-if="showAddPanel"
      data-testid="add-knowledge-panel"
      class="bg-white border border-teal-200 rounded-lg p-6 space-y-4"
    >
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <FileUp class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>匯入 PDF / Markdown / TXT / JSON 或手動新增知識條目</span>
          </h3>
          <p class="text-xs text-[#64748B] mt-0.5">
            檔案於瀏覽器本機解析並儲存於擴充知識庫（<code>localStorage</code>），AI 工作台對話時會一併檢索。
          </p>
        </div>

        <label class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-[#0F766E] text-[#0F766E] bg-teal-50/50 hover:bg-teal-50 text-xs font-medium cursor-pointer">
          <FileUp class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ isParsingFile ? '檔案解析中...' : '選擇檔案 (.pdf / .md / .txt / .json)' }}</span>
          <input
            type="file"
            accept=".pdf,.md,.markdown,.txt,.json"
            data-testid="knowledge-file-input"
            class="hidden"
            @change="handleFileUpload"
          />
        </label>
      </div>

      <p v-if="parseStatusMessage" class="text-xs text-[#0F766E] bg-teal-50 border border-teal-200 rounded px-3 py-2">
        {{ parseStatusMessage }}
      </p>
      <p v-if="formError" data-testid="knowledge-form-error" class="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded px-3 py-2">
        {{ formError }}
      </p>

      <form class="grid grid-cols-12 gap-4 text-xs" @submit.prevent="handleSaveCustomArticle">
        <div class="col-span-6">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-title">條目標題</label>
          <input
            id="kb-title"
            v-model="formTitle"
            data-testid="kb-title-input"
            type="text"
            placeholder="例如：半導體廠有機溶劑作業安全指引"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-3">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-type">資料類型</label>
          <select
            id="kb-type"
            v-model="formType"
            class="w-full rounded border border-[#CBD5E1] bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          >
            <option value="guideline">官方／實務指引</option>
            <option value="regulation">法規標準</option>
          </select>
        </div>

        <div class="col-span-3">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-category">知識分類</label>
          <select
            id="kb-category"
            v-model="formCategory"
            class="w-full rounded border border-[#CBD5E1] bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="col-span-12">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-summary">摘要說明</label>
          <textarea
            id="kb-summary"
            v-model="formSummary"
            data-testid="kb-summary-input"
            rows="2"
            placeholder="摘要描述本條目核心安全規範與適用情境"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-6">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-keypoints">核心重點（每行一條）</label>
          <textarea
            id="kb-keypoints"
            v-model="formKeyPoints"
            rows="4"
            placeholder="例如：作業前應啟動局部排氣裝置&#10;作業人員應依 SDS 配戴適當防毒面具"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-6">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-markdown">全文／解析內容（Markdown）</label>
          <textarea
            id="kb-markdown"
            v-model="formContentMarkdown"
            rows="4"
            placeholder="匯入 PDF 或 MD 後將自動填入抽取內容，可供 Agent 檢索摘要"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs font-mono focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-4">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-publisher">發布機關／來源單位</label>
          <input
            id="kb-publisher"
            v-model="formPublisher"
            data-testid="kb-publisher-input"
            type="text"
            placeholder="例如：勞動部職業安全衛生署"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-5">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-url">官方／參考來源網址</label>
          <input
            id="kb-url"
            v-model="formOfficialUrl"
            data-testid="kb-url-input"
            type="url"
            placeholder="https://www.osha.gov.tw/"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-3">
          <label class="block font-semibold text-[#475569] mb-1" for="kb-date">更新／查證日期</label>
          <input
            id="kb-date"
            v-model="formUpdatedAt"
            type="date"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-12 flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-3.5 py-2 rounded border border-[#E2E8F0] text-[#475569] hover:bg-slate-50 cursor-pointer"
            @click="showAddPanel = false"
          >
            取消
          </button>
          <button
            type="submit"
            data-testid="save-custom-kb-btn"
            class="px-4 py-2 rounded bg-[#0F766E] text-white font-semibold hover:bg-[#0D655E] cursor-pointer"
          >
            加入知識庫
          </button>
        </div>
      </form>
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

    <!-- Error / Offline State (Only when both backend and custom list are empty) -->
    <section
      v-if="errorMessage && articles.length === 0 && viewMode === 'articles'"
      data-testid="knowledge-error-state"
      class="bg-white border border-red-200 rounded-lg p-8 text-center space-y-3"
    >
      <div class="text-sm font-semibold text-[#DC2626]">{{ errorMessage }}</div>
      <p class="text-xs text-[#64748B]">
        為確保資料來源可追溯性，前端不硬編未連線時之離線假資料。啟動後端 API 後即可恢復即時檢索，或先使用上方「新增 / 匯入 PDF・MD」。
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
            <div
              class="rounded-md border p-4 transition-colors cursor-pointer space-y-2"
              :class="
                selectedArticle?.id === article.id
                  ? 'border-[#0F766E] bg-teal-50/40'
                  : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
              "
              :data-testid="`knowledge-item-${article.id}`"
              @click="selectedArticleId = article.id"
            >
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-[#334155]">
                    {{ getEntryTypeLabel(article.type) }}
                  </span>
                  <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200">
                    {{ article.category }}
                  </span>
                  <span
                    v-if="knowledgeStore.isCustomArticle(article.id)"
                    class="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-[#D97706] border border-amber-200"
                  >
                    使用者擴充
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] text-[#64748B] flex items-center gap-1">
                    <Calendar class="h-3 w-3" aria-hidden="true" />
                    <span>{{ article.source.updatedAt }}</span>
                  </span>
                  <button
                    v-if="knowledgeStore.isCustomArticle(article.id)"
                    type="button"
                    aria-label="刪除此擴充知識條目"
                    class="p-1 text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                    @click.stop="knowledgeStore.removeCustomArticle(article.id)"
                  >
                    <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="text-sm font-semibold text-[#1E293B]">{{ article.title }}</div>
              <p class="text-xs text-[#475569] leading-relaxed line-clamp-2">{{ article.summary }}</p>
              <div class="text-[11px] text-[#64748B]">來源機關：{{ article.source.publisher }}</div>
            </div>
          </li>
        </ul>
      </section>

      <section
        v-if="selectedArticle"
        data-testid="knowledge-detail-panel"
        class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5 sticky top-6"
      >
        <div class="space-y-2 border-b border-[#E2E8F0] pb-4">
          <div class="flex items-center gap-2 flex-wrap">
            <StatusBadge :label="getEntryTypeLabel(selectedArticle.type)" tone="neutral" :show-dot="false" />
            <StatusBadge :label="selectedArticle.category" tone="success" :show-dot="false" />
            <StatusBadge
              v-if="knowledgeStore.isCustomArticle(selectedArticle.id)"
              label="使用者擴充知識"
              tone="warning"
              :show-dot="false"
            />
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
            <span>前往來源網址查閱</span>
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
