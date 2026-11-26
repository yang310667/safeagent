<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type {
  AccidentCaseHazardType,
  AccidentCaseIndustry,
  AccidentCaseItem,
} from '@safeagent/shared';
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { fetchAccidentCases } from '@/services/accident-cases.service';
import { ApiClientError } from '@/services/api-client';

const reservedIndustries: AccidentCaseIndustry[] = [
  '製造業',
  '營造業',
  '化學工業',
  '倉儲與運輸業',
  '公用事業與設備維護',
];

const reservedHazardTypes: AccidentCaseHazardType[] = [
  '墜落、滾落',
  '感電',
  '被夾、被捲',
  '物體飛落',
  '火災與爆炸',
  '有害物接觸',
  '缺氧窒息',
  '物體倒塌、崩塌',
];

const searchQuery = ref('');
const selectedIndustry = ref<string>('');
const selectedHazardType = ref<string>('');

const cases = ref<AccidentCaseItem[]>([]);
const selectedCaseId = ref<string | null>(null);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
let activeController: AbortController | null = null;

const selectedCase = computed<AccidentCaseItem | null>(() => {
  if (!cases.value.length) return null;
  return cases.value.find((item) => item.id === selectedCaseId.value) ?? cases.value[0];
});

async function loadCases(): Promise<void> {
  if (activeController) {
    activeController.abort();
  }
  const controller = new AbortController();
  activeController = controller;

  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await fetchAccidentCases(
      {
        query: searchQuery.value,
        industry: selectedIndustry.value || undefined,
        hazardType: selectedHazardType.value || undefined,
      },
      undefined,
      controller.signal,
    );
    cases.value = response.items;
    selectedCaseId.value = response.items[0]?.id ?? null;
  } catch (err) {
    if (err instanceof ApiClientError && err.code === 'REQUEST_ABORTED') {
      return;
    }
    errorMessage.value =
      err instanceof ApiClientError
        ? `${err.message}（請確認後端 Worker API 是否已啟動）`
        : '載入職災案例資料失敗';
    cases.value = [];
  } finally {
    if (activeController === controller) {
      isLoading.value = false;
      activeController = null;
    }
  }
}

function resetFilters(): void {
  searchQuery.value = '';
  selectedIndustry.value = '';
  selectedHazardType.value = '';
  void loadCases();
}

onMounted(() => {
  void loadCases();
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
          <h2 class="text-lg font-semibold text-[#1E293B]">職災案例分析（Occupational Accident Cases）</h2>
          <StatusBadge label="Day 2 已啟用・官方公開案例" tone="success" />
        </div>
        <p class="text-sm text-[#64748B]">
          收錄勞動部職業安全衛生署「職災案例宣導」公開案例之事故經過、發生原因與預防措施，作為危害辨識與防災學習參考，未增補未公開之時間或個人資訊。
        </p>
      </div>
    </section>

    <!-- Search & Filters -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6">
      <form class="grid grid-cols-12 gap-4 items-end" @submit.prevent="loadCases">
        <div class="col-span-4">
          <label class="block text-xs font-medium text-[#475569] mb-1.5" for="case-search">案例搜尋</label>
          <div class="relative">
            <Search class="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              id="case-search"
              v-model="searchQuery"
              data-testid="case-search-input"
              type="text"
              placeholder="輸入設備、媒介物或關鍵字（如：採光罩、馬達、氯氣）"
              class="w-full rounded-md border border-[#CBD5E1] pl-9 pr-3 py-2 text-sm focus:border-[#0F766E] focus:outline-none"
            />
          </div>
        </div>

        <div class="col-span-3">
          <label class="block text-xs font-medium text-[#475569] mb-1.5" for="industry-filter">產業分類</label>
          <select
            id="industry-filter"
            v-model="selectedIndustry"
            data-testid="industry-filter"
            class="w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
            @change="loadCases"
          >
            <option value="">全部產業分類</option>
            <option v-for="ind in reservedIndustries" :key="ind" :value="ind">{{ ind }}</option>
          </select>
        </div>

        <div class="col-span-3">
          <label class="block text-xs font-medium text-[#475569] mb-1.5" for="hazard-filter">危害類型</label>
          <select
            id="hazard-filter"
            v-model="selectedHazardType"
            data-testid="hazard-filter"
            class="w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
            @change="loadCases"
          >
            <option value="">全部危害類型</option>
            <option v-for="haz in reservedHazardTypes" :key="haz" :value="haz">{{ haz }}</option>
          </select>
        </div>

        <div class="col-span-2 flex gap-2">
          <button
            type="submit"
            data-testid="case-filter-btn"
            class="flex-1 py-2 rounded-md bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0D655E] transition-colors cursor-pointer"
          >
            篩選
          </button>
          <button
            type="button"
            data-testid="case-reset-btn"
            class="px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-[#475569] text-sm font-medium hover:bg-slate-50 cursor-pointer"
            @click="resetFilters"
          >
            重設
          </button>
        </div>
      </form>
    </section>

    <!-- Error / Offline State -->
    <section
      v-if="errorMessage"
      data-testid="cases-error-state"
      class="bg-white border border-red-200 rounded-lg p-8 text-center space-y-3"
    >
      <div class="text-sm font-semibold text-[#DC2626]">{{ errorMessage }}</div>
      <p class="text-xs text-[#64748B]">啟動後端 Worker API 後即可檢視完整公開職災案例與預防措施。</p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] cursor-pointer"
        @click="loadCases"
      >
        <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
        <span>重新連線查詢</span>
      </button>
    </section>

    <!-- Loading -->
    <section
      v-else-if="isLoading"
      class="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center text-sm text-[#64748B]"
    >
      正在查詢公開職災案例資料...
    </section>

    <!-- Empty Result -->
    <section
      v-else-if="cases.length === 0"
      data-testid="cases-empty-state"
      class="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center space-y-2"
    >
      <div class="text-sm font-medium text-[#1E293B]">查無符合篩選條件的職災案例</div>
      <p class="text-xs text-[#64748B]">請清除部分篩選條件或更換關鍵字後再試。</p>
      <button
        type="button"
        class="mt-2 px-3 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#0F766E] hover:bg-teal-50 cursor-pointer"
        @click="resetFilters"
      >
        顯示全部公開案例
      </button>
    </section>

    <!-- Cases Master-Detail -->
    <div v-else class="grid grid-cols-12 gap-6 items-start">
      <!-- Case List -->
      <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-[#D97706]" aria-hidden="true" />
            <span>公開案例清單（共 {{ cases.length }} 筆）</span>
          </h3>
        </div>

        <ul class="space-y-3" data-testid="accident-case-list">
          <li v-for="item in cases" :key="item.id">
            <button
              type="button"
              :data-testid="`case-item-${item.id}`"
              class="w-full text-left rounded-md border p-4 transition-colors cursor-pointer space-y-2"
              :class="
                selectedCase?.id === item.id
                  ? 'border-[#0F766E] bg-teal-50/40'
                  : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'
              "
              @click="selectedCaseId = item.id"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-[#334155]">
                  {{ item.industry }}
                </span>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded bg-red-50 text-[#DC2626] border border-red-200">
                  {{ item.hazardType }}
                </span>
              </div>
              <div class="text-sm font-semibold text-[#1E293B]">{{ item.title }}</div>
              <p class="text-xs text-[#475569] leading-relaxed">{{ item.summary }}</p>
              <div class="text-[11px] text-[#64748B]">災害媒介物：{{ item.medium }}</div>
            </button>
          </li>
        </ul>
      </section>

      <!-- Case Detail -->
      <section
        v-if="selectedCase"
        data-testid="accident-case-detail"
        class="col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5"
      >
        <div class="border-b border-[#E2E8F0] pb-4 space-y-2">
          <div class="flex items-center gap-2">
            <StatusBadge :label="selectedCase.industry" tone="neutral" :show-dot="false" />
            <StatusBadge :label="selectedCase.hazardType" tone="danger" :show-dot="false" />
          </div>
          <h3 class="text-base font-semibold text-[#1E293B]">{{ selectedCase.title }}</h3>
          <div class="text-xs text-[#64748B]">災害媒介物：{{ selectedCase.medium }}</div>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5">
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <Building2 class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>事故經過</span>
          </div>
          <p class="text-xs text-[#334155] leading-relaxed">{{ selectedCase.incidentDescription }}</p>
        </div>

        <div class="space-y-2.5">
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <ShieldAlert class="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
            <span>事故原因分析</span>
          </div>
          <div class="grid grid-cols-3 gap-3 text-xs">
            <div class="rounded border border-red-200 bg-red-50/40 p-3 space-y-1">
              <div class="font-semibold text-[#DC2626]">直接原因</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="c in selectedCase.causes.direct" :key="c">· {{ c }}</li>
              </ul>
            </div>
            <div class="rounded border border-amber-200 bg-amber-50/40 p-3 space-y-1">
              <div class="font-semibold text-[#D97706]">間接原因</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="c in selectedCase.causes.indirect" :key="c">· {{ c }}</li>
              </ul>
            </div>
            <div class="rounded border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1">
              <div class="font-semibold text-[#1E293B]">基本原因</div>
              <ul class="text-[#475569] space-y-1">
                <li v-for="c in selectedCase.causes.basic" :key="c">· {{ c }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <ShieldCheck class="h-3.5 w-3.5 text-[#16A34A]" aria-hidden="true" />
            <span>預防與改善對策</span>
          </div>
          <ul class="space-y-1.5">
            <li
              v-for="measure in selectedCase.preventiveMeasures"
              :key="measure"
              class="text-xs text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-3 py-2"
            >
              · {{ measure }}
            </li>
          </ul>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-[#1E293B]">官方資料來源與相關法規</span>
            <span class="text-[11px] font-mono text-[#64748B]">
              查證日期：{{ selectedCase.source.updatedAt }}
            </span>
          </div>
          <div class="text-xs text-[#475569]">
            發布機關：{{ selectedCase.source.publisher }}｜{{ selectedCase.source.title }}
          </div>
          <div class="text-[11px] text-[#64748B]">
            相關法規：{{ selectedCase.relatedRegulations.join('、') }}
          </div>
          <a
            :href="selectedCase.source.officialUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline pt-1"
          >
            <span>前往勞動部職業安全衛生署網站查閱</span>
            <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  </div>
</template>
