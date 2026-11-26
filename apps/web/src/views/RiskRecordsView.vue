<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  formatPreliminaryReportMarkdown,
  type PreliminarySafetyReport,
  type RiskAssessmentRecord,
  type RiskLevel,
} from '@safeagent/shared';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  FileText,
  Grid2x2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next';
import RiskMatrixChart from '@/components/RiskMatrixChart.vue';
import StatusBadge, { type BadgeTone } from '@/components/StatusBadge.vue';
import { useRiskStore } from '@/stores/risk';

const riskStore = useRiskStore();

const searchQuery = ref('');
const levelFilter = ref<'all' | RiskLevel>('all');
const editingId = ref<string | null>(null);
const editingName = ref('');
const confirmClearAll = ref(false);
const generatedReport = ref<PreliminarySafetyReport | null>(null);
const copiedReport = ref(false);

function getDisplayName(record: RiskAssessmentRecord): string {
  return record.recordName?.trim() || `${record.scenarioTitle}－${record.hazardName}`;
}

function getToneByLevel(level: RiskLevel): BadgeTone {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return riskStore.records.filter((rec) => {
    if (levelFilter.value !== 'all' && rec.initialRisk.riskLevel !== levelFilter.value) {
      return false;
    }
    if (!query) return true;
    const haystack = [
      rec.recordName ?? '',
      rec.scenarioTitle,
      rec.hazardName,
      rec.controlsApplied.join(' '),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
});

const highRiskCount = computed(
  () => riskStore.records.filter((rec) => rec.initialRisk.riskLevel === 'high').length,
);

const residualEvaluatedCount = computed(
  () => riskStore.records.filter((rec) => rec.residualRisk !== null).length,
);

function startRename(record: RiskAssessmentRecord): void {
  editingId.value = record.id;
  editingName.value = getDisplayName(record);
}

function cancelRename(): void {
  editingId.value = null;
  editingName.value = '';
}

function saveRename(id: string): void {
  riskStore.renameRecord(id, editingName.value);
  editingId.value = null;
  editingName.value = '';
}

function handleDeleteRecord(id: string): void {
  if (editingId.value === id) {
    cancelRename();
  }
  riskStore.removeRecord(id);
}

function handleConfirmClearAll(): void {
  riskStore.clearRecords();
  confirmClearAll.value = false;
  cancelRename();
  generatedReport.value = null;
}

function handleGenerateReport(): void {
  const target = filteredRecords.value;
  if (target.length === 0) return;

  generatedReport.value = formatPreliminaryReportMarkdown({
    scenarioTitle:
      target.length === 1
        ? getDisplayName(target[0])
        : `SafeAgent 風險評估紀錄彙整（共 ${target.length} 筆）`,
    scenarioSummary: `自風險評估紀錄管理頁匯出，共包含 ${target.length} 筆經使用者現場確認之 5×5 風險矩陣運算結果。`,
    hazards: target.map((rec) => ({
      hazardType: rec.recordName ? `[${rec.recordName}] ${rec.hazardName}` : rec.hazardName,
      description: `作業情境「${rec.scenarioTitle}」之人工確認危害項目`,
      potentialConsequence: rec.initialRisk.gradeLabel,
      recommendedControls: rec.controlsApplied,
      relatedRegulations: ['勞動部職業安全衛生署《風險評估指引》'],
    })),
    riskRecords: target,
  });
}

async function handleCopyMarkdown(): Promise<void> {
  if (!generatedReport.value || typeof navigator === 'undefined' || !navigator.clipboard) return;
  await navigator.clipboard.writeText(generatedReport.value.markdownContent);
  copiedReport.value = true;
  setTimeout(() => {
    copiedReport.value = false;
  }, 2000);
}

function handleDownloadMarkdown(): void {
  if (!generatedReport.value || typeof document === 'undefined') return;
  const blob = new Blob([generatedReport.value.markdownContent], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'safeagent-risk-records-report.md';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Top Banner & Actions -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 text-xs font-medium text-[#0F766E]">
            <Grid2x2 class="h-4 w-4" aria-hidden="true" />
            <span>5×5 風險矩陣紀錄封存與管理</span>
          </div>
          <h2 class="text-xl font-bold text-[#1E293B]">風險評估紀錄</h2>
          <p class="text-xs text-[#475569] leading-relaxed max-w-3xl">
            檢視並管理所有經使用者現場確認後計算的 5×5 風險矩陣結果。每筆紀錄皆保存於本機瀏覽器儲存空間，可自由設定或修改紀錄名稱、刪除單筆或全部紀錄，並匯出 Markdown 報告。
          </p>
        </div>

        <a
          href="#/risk-matrix"
          class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] transition-colors"
        >
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>新增風險矩陣運算</span>
        </a>
      </div>

      <!-- Summary KPI Strip -->
      <div class="grid grid-cols-3 gap-4 pt-2 border-t border-[#E2E8F0]">
        <div class="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3">
          <p class="text-[11px] text-[#64748B]">已保存評估紀錄</p>
          <p class="text-xl font-bold text-[#1E293B] mt-0.5 tabular-nums">
            {{ riskStore.records.length }} <span class="text-xs font-normal text-[#64748B]">筆</span>
          </p>
        </div>
        <div class="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3">
          <p class="text-[11px] text-[#64748B]">改善前高風險（≥15 分）</p>
          <p class="text-xl font-bold text-[#DC2626] mt-0.5 tabular-nums">
            {{ highRiskCount }} <span class="text-xs font-normal text-[#64748B]">筆</span>
          </p>
        </div>
        <div class="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3">
          <p class="text-[11px] text-[#64748B]">已填報剩餘風險複評</p>
          <p class="text-xl font-bold text-[#0F766E] mt-0.5 tabular-nums">
            {{ residualEvaluatedCount }} <span class="text-xs font-normal text-[#64748B]">筆</span>
          </p>
        </div>
      </div>
    </section>

    <!-- Empty State -->
    <section
      v-if="riskStore.records.length === 0"
      data-testid="risk-records-page-empty"
      class="bg-white border border-dashed border-[#CBD5E1] rounded-lg p-12 text-center space-y-3"
    >
      <Grid2x2 class="h-8 w-8 text-[#94A3B8] mx-auto" aria-hidden="true" />
      <h3 class="text-sm font-semibold text-[#1E293B]">目前尚無已儲存的風險矩陣運算紀錄</h3>
      <p class="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
        請先至「風險矩陣」頁面完成現場危害與防護條件確認並點擊計算，系統會自動將結果保存於此處供命名與管理。
      </p>
      <div>
        <a
          href="#/risk-matrix"
          class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E]"
        >
          <Plus class="h-3.5 w-3.5" aria-hidden="true" />
          <span>前往 5×5 風險矩陣計算</span>
        </a>
      </div>
    </section>

    <template v-else>
      <!-- Filter + Chart Overview -->
      <div class="grid grid-cols-12 gap-6 items-start">
        <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
          <div class="border-b border-[#E2E8F0] pb-2.5">
            <h3 class="text-sm font-semibold text-[#1E293B]">已紀錄項目分布圖</h3>
            <p class="text-[11px] text-[#64748B] mt-0.5">
              呈現目前篩選結果的改善前（●）與剩餘風險（◆）分布位置。
            </p>
          </div>
          <RiskMatrixChart :records="filteredRecords" />
        </section>

        <section class="col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
          <!-- Toolbar -->
          <div class="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div class="flex items-center gap-2 flex-1">
              <div class="relative flex-1 max-w-xs">
                <Search
                  class="h-3.5 w-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  v-model="searchQuery"
                  data-testid="records-search-input"
                  type="text"
                  placeholder="搜尋紀錄名稱、作業情境或危害..."
                  class="w-full rounded-md border border-[#CBD5E1] pl-8 pr-3 py-1.5 text-xs text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
                />
              </div>
              <select
                v-model="levelFilter"
                aria-label="篩選風險等級"
                class="rounded-md border border-[#CBD5E1] px-2.5 py-1.5 text-xs text-[#1E293B] bg-white focus:border-[#0F766E] focus:outline-none"
              >
                <option value="all">全部等級</option>
                <option value="high">高風險</option>
                <option value="medium">中風險</option>
                <option value="low">低風險</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                :disabled="filteredRecords.length === 0"
                data-testid="records-generate-report-btn"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
                @click="handleGenerateReport"
              >
                <FileText class="h-3.5 w-3.5" aria-hidden="true" />
                <span>匯出報告</span>
              </button>

              <template v-if="!confirmClearAll">
                <button
                  type="button"
                  data-testid="records-clear-all-btn"
                  class="px-2.5 py-1.5 rounded-md border border-[#E2E8F0] text-xs text-[#64748B] hover:text-[#DC2626] hover:border-[#FCA5A5] cursor-pointer"
                  @click="confirmClearAll = true"
                >
                  全部清除
                </button>
              </template>
              <div v-else class="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="records-confirm-clear-all-btn"
                  class="px-2.5 py-1.5 rounded-md bg-[#DC2626] text-white text-xs font-medium hover:bg-[#B91C1C] cursor-pointer"
                  @click="handleConfirmClearAll"
                >
                  確定清空
                </button>
                <button
                  type="button"
                  class="px-2 py-1.5 rounded-md border border-[#E2E8F0] text-xs text-[#475569] hover:bg-slate-50 cursor-pointer"
                  @click="confirmClearAll = false"
                >
                  取消
                </button>
              </div>
            </div>
          </div>

          <!-- No Filter Matches -->
          <div
            v-if="filteredRecords.length === 0"
            class="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-6 text-center text-xs text-[#64748B]"
          >
            沒有符合搜尋或等級篩選條件的風險評估紀錄。
          </div>

          <!-- Saved Records Cards -->
          <div v-else class="space-y-3" data-testid="saved-records-list">
            <article
              v-for="rec in filteredRecords"
              :key="rec.id"
              data-testid="saved-record-item"
              class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <!-- Rename Editor -->
                  <div v-if="editingId === rec.id" class="flex items-center gap-2">
                    <input
                      v-model="editingName"
                      data-testid="rename-record-input"
                      type="text"
                      placeholder="輸入自訂紀錄名稱..."
                      class="flex-1 rounded-md border border-[#0F766E] bg-white px-2.5 py-1.5 text-xs text-[#1E293B] focus:outline-none"
                      @keyup.enter="saveRename(rec.id)"
                      @keyup.escape="cancelRename"
                    />
                    <button
                      type="button"
                      data-testid="save-record-name-btn"
                      aria-label="儲存紀錄名稱"
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] cursor-pointer"
                      @click="saveRename(rec.id)"
                    >
                      <Check class="h-3.5 w-3.5" aria-hidden="true" />
                      <span>儲存</span>
                    </button>
                    <button
                      type="button"
                      aria-label="取消改名"
                      class="inline-flex items-center px-2 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-xs text-[#475569] hover:bg-slate-50 cursor-pointer"
                      @click="cancelRename"
                    >
                      <X class="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <!-- Record Title Display -->
                  <div v-else class="flex items-center gap-2 flex-wrap">
                    <h4
                      data-testid="saved-record-title"
                      class="text-sm font-semibold text-[#1E293B] truncate"
                    >
                      {{ getDisplayName(rec) }}
                    </h4>
                    <span
                      v-if="rec.recordName"
                      class="inline-flex items-center px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] text-[10px] font-medium"
                    >
                      已自訂名稱
                    </span>
                  </div>

                  <p class="text-[11px] text-[#64748B] mt-1">
                    作業情境：{{ rec.scenarioTitle }} ｜ 危害項目：{{ rec.hazardName }} ｜ 紀錄時間：{{ formatDateTime(rec.evaluatedAt) }}
                  </p>
                </div>

                <!-- Card Actions -->
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    v-if="editingId !== rec.id"
                    type="button"
                    data-testid="rename-record-btn"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E2E8F0] bg-white text-[11px] text-[#334155] hover:border-[#0F766E] hover:text-[#0F766E] cursor-pointer"
                    @click="startRename(rec)"
                  >
                    <Pencil class="h-3 w-3" aria-hidden="true" />
                    <span>設定名稱</span>
                  </button>
                  <button
                    type="button"
                    data-testid="delete-record-btn"
                    aria-label="刪除此紀錄"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E2E8F0] bg-white text-[11px] text-[#64748B] hover:border-[#FCA5A5] hover:text-[#DC2626] cursor-pointer"
                    @click="handleDeleteRecord(rec.id)"
                  >
                    <Trash2 class="h-3 w-3" aria-hidden="true" />
                    <span>刪除</span>
                  </button>
                </div>
              </div>

              <!-- Risk Scores & Controls -->
              <div class="grid grid-cols-2 gap-3 text-xs bg-white border border-[#E2E8F0] rounded p-3">
                <div class="space-y-1">
                  <span class="text-[11px] font-medium text-[#64748B]">改善前風險（P×S）</span>
                  <div>
                    <StatusBadge
                      :label="`${rec.initialRisk.probability}×${rec.initialRisk.severity}=${rec.initialRisk.score} (${rec.initialRisk.gradeLabel})`"
                      :tone="getToneByLevel(rec.initialRisk.riskLevel)"
                      :show-dot="false"
                    />
                  </div>
                </div>
                <div class="space-y-1">
                  <span class="text-[11px] font-medium text-[#64748B]">剩餘風險複評（P×S）</span>
                  <div class="flex items-center gap-2 flex-wrap">
                    <StatusBadge
                      v-if="rec.residualRisk"
                      :label="`${rec.residualRisk.probability}×${rec.residualRisk.severity}=${rec.residualRisk.score} (${rec.residualRisk.gradeLabel})`"
                      :tone="getToneByLevel(rec.residualRisk.riskLevel)"
                      :show-dot="false"
                    />
                    <span v-else class="text-[#94A3B8]">未填寫</span>
                    <span
                      v-if="rec.residualRisk && rec.initialRisk.score > rec.residualRisk.score"
                      class="text-[11px] font-medium text-[#0F766E]"
                    >
                      ↓ 降 {{ rec.initialRisk.score - rec.residualRisk.score }} 分
                    </span>
                  </div>
                </div>
              </div>

              <div class="text-[11px] text-[#475569]">
                <span class="font-semibold text-[#334155]">採行控制措施：</span>
                <span>{{ rec.controlsApplied.length > 0 ? rec.controlsApplied.join('、') : '未填寫' }}</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <!-- Markdown Report Preview -->
      <section
        v-if="generatedReport"
        data-testid="records-report-preview"
        class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3"
      >
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#1E293B]">
            <AlertTriangle class="h-4 w-4 text-[#D97706]" aria-hidden="true" />
            <span>{{ generatedReport.title }}（Markdown 結構化預覽）</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-[#E2E8F0] bg-white text-xs text-[#1E293B] hover:bg-slate-50 cursor-pointer"
              @click="handleCopyMarkdown"
            >
              <Copy class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ copiedReport ? '已複製' : '複製 Markdown' }}</span>
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#0F766E] text-white text-xs hover:bg-[#0D655E] cursor-pointer"
              @click="handleDownloadMarkdown"
            >
              <Download class="h-3.5 w-3.5" aria-hidden="true" />
              <span>下載 .md 報告</span>
            </button>
          </div>
        </div>
        <pre class="text-xs font-mono text-[#334155] bg-[#F8FAFC] border border-[#E2E8F0] rounded p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ generatedReport.markdownContent }}</pre>
      </section>
    </template>
  </div>
</template>
