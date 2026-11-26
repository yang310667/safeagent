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
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FileText,
  Grid2x2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-vue-next';
import RiskMatrixChart from '@/components/RiskMatrixChart.vue';
import StatusBadge, { type BadgeTone } from '@/components/StatusBadge.vue';
import { useRiskStore } from '@/stores/risk';

const riskStore = useRiskStore();

const searchQuery = ref('');
const levelFilter = ref<'all' | RiskLevel>('all');
const selectedRecordId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editingName = ref('');
const confirmClearAll = ref(false);
const generatedReport = ref<PreliminarySafetyReport | null>(null);
const copiedReport = ref(false);

const selectedRecord = computed(
  () => riskStore.records.find((rec) => rec.id === selectedRecordId.value) ?? null,
);

function getDisplayName(record: RiskAssessmentRecord): string {
  return record.recordName?.trim() || `${record.scenarioTitle}－${record.hazardName}`;
}

function getToneByLevel(level: RiskLevel): BadgeTone {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
}

function getAcceptabilityLabel(acceptability: 'acceptable' | 'tolerable_with_controls' | 'unacceptable'): string {
  if (acceptability === 'unacceptable') return '不可接受風險';
  if (acceptability === 'tolerable_with_controls') return '須管制與降低之風險';
  return '可接受風險';
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

function openRecordDetail(id: string): void {
  if (editingId.value === id) return;
  selectedRecordId.value = id;
  generatedReport.value = null;
  copiedReport.value = false;
}

function backToList(): void {
  selectedRecordId.value = null;
  editingId.value = null;
  editingName.value = '';
  generatedReport.value = null;
  copiedReport.value = false;
}

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
  if (selectedRecordId.value === id) {
    selectedRecordId.value = null;
    generatedReport.value = null;
  }
  riskStore.removeRecord(id);
}

function handleConfirmClearAll(): void {
  riskStore.clearRecords();
  confirmClearAll.value = false;
  selectedRecordId.value = null;
  cancelRename();
  generatedReport.value = null;
}

function handleGenerateTopicReport(record: RiskAssessmentRecord): void {
  generatedReport.value = formatPreliminaryReportMarkdown({
    scenarioTitle: getDisplayName(record),
    scenarioSummary: `作業情境「${record.scenarioTitle}」之單一主題 5×5 風險矩陣評估紀錄（危害項目：${record.hazardName}）。`,
    hazards: [
      {
        hazardType: record.hazardName,
        description: `作業情境「${record.scenarioTitle}」之人工確認危害項目`,
        potentialConsequence: record.initialRisk.gradeLabel,
        recommendedControls: record.controlsApplied,
        relatedRegulations: ['勞動部職業安全衛生署《風險評估指引》'],
      },
    ],
    riskRecords: [record],
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
  link.download = 'safeagent-risk-topic-report.md';
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Topic Detail View -->
    <template v-if="selectedRecord">
      <section
        data-testid="record-detail-view"
        class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5"
      >
        <!-- Detail Top Bar -->
        <div class="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
          <div class="space-y-2 flex-1 min-w-0">
            <button
              type="button"
              data-testid="back-to-records-list-btn"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F766E] hover:underline cursor-pointer"
              @click="backToList"
            >
              <ArrowLeft class="h-3.5 w-3.5" aria-hidden="true" />
              <span>返回評估主題列表</span>
            </button>

            <!-- Inline Rename in Detail View -->
            <div v-if="editingId === selectedRecord.id" class="flex items-center gap-2 max-w-xl">
              <input
                v-model="editingName"
                data-testid="rename-record-input"
                type="text"
                placeholder="輸入評估主題名稱..."
                class="flex-1 rounded-md border border-[#0F766E] bg-white px-3 py-1.5 text-sm text-[#1E293B] focus:outline-none"
                @keyup.enter="saveRename(selectedRecord.id)"
                @keyup.escape="cancelRename"
              />
              <button
                type="button"
                data-testid="save-record-name-btn"
                aria-label="儲存紀錄名稱"
                class="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] cursor-pointer"
                @click="saveRename(selectedRecord.id)"
              >
                <Check class="h-3.5 w-3.5" aria-hidden="true" />
                <span>儲存名稱</span>
              </button>
              <button
                type="button"
                aria-label="取消改名"
                class="inline-flex items-center px-2.5 py-1.5 rounded-md border border-[#E2E8F0] bg-white text-xs text-[#475569] hover:bg-slate-50 cursor-pointer"
                @click="cancelRename"
              >
                <X class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div v-else class="flex items-center gap-2.5 flex-wrap">
              <h2 data-testid="detail-record-title" class="text-xl font-bold text-[#1E293B]">
                {{ getDisplayName(selectedRecord) }}
              </h2>
              <span
                v-if="selectedRecord.recordName"
                class="inline-flex items-center px-2 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] text-[11px] font-medium"
              >
                自訂主題名稱
              </span>
            </div>

            <p class="text-xs text-[#64748B]">
              作業情境：{{ selectedRecord.scenarioTitle }} ｜ 危害項目：{{ selectedRecord.hazardName }} ｜ 紀錄時間：{{ formatDateTime(selectedRecord.evaluatedAt) }}
            </p>
          </div>

          <!-- Detail Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="editingId !== selectedRecord.id"
              type="button"
              data-testid="detail-rename-btn"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#334155] hover:border-[#0F766E] hover:text-[#0F766E] cursor-pointer"
              @click="startRename(selectedRecord)"
            >
              <Pencil class="h-3.5 w-3.5" aria-hidden="true" />
              <span>設定名稱</span>
            </button>
            <button
              type="button"
              data-testid="records-generate-report-btn"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] cursor-pointer"
              @click="handleGenerateTopicReport(selectedRecord)"
            >
              <FileText class="h-3.5 w-3.5" aria-hidden="true" />
              <span>匯出本主題報告</span>
            </button>
            <button
              type="button"
              data-testid="detail-delete-btn"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#64748B] hover:border-[#FCA5A5] hover:text-[#DC2626] cursor-pointer"
              @click="handleDeleteRecord(selectedRecord.id)"
            >
              <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
              <span>刪除紀錄</span>
            </button>
          </div>
        </div>

        <!-- Detail Body: 5x5 Matrix Only (No Bar Chart) + Full Assessment Details -->
        <div class="grid grid-cols-12 gap-6 items-start">
          <div class="col-span-6 space-y-2">
            <RiskMatrixChart :records="[selectedRecord]" :show-bar-chart="false" />
          </div>

          <div class="col-span-6 space-y-4">
            <!-- Initial Risk Card -->
            <div class="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-semibold text-[#1E293B]">改善前風險評定（Initial Risk）</h3>
                <StatusBadge
                  :label="`${selectedRecord.initialRisk.probability}×${selectedRecord.initialRisk.severity}=${selectedRecord.initialRisk.score} (${selectedRecord.initialRisk.gradeLabel})`"
                  :tone="getToneByLevel(selectedRecord.initialRisk.riskLevel)"
                  :show-dot="false"
                />
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs text-[#475569]">
                <div class="rounded bg-white border border-[#E2E8F0] px-3 py-2">
                  <span class="block text-[10px] text-[#64748B]">可能性 (P)</span>
                  <span class="font-semibold text-[#1E293B]">{{ selectedRecord.initialRisk.probability }}</span>
                </div>
                <div class="rounded bg-white border border-[#E2E8F0] px-3 py-2">
                  <span class="block text-[10px] text-[#64748B]">嚴重度 (S)</span>
                  <span class="font-semibold text-[#1E293B]">{{ selectedRecord.initialRisk.severity }}</span>
                </div>
                <div class="rounded bg-white border border-[#E2E8F0] px-3 py-2">
                  <span class="block text-[10px] text-[#64748B]">可接受性判定</span>
                  <span class="font-semibold text-[#1E293B]">{{ getAcceptabilityLabel(selectedRecord.initialRisk.acceptability) }}</span>
                </div>
              </div>
              <p class="text-xs text-[#334155] leading-relaxed bg-white border border-[#E2E8F0] rounded p-3">
                <span class="font-semibold text-[#1E293B]">建議處置行動：</span>
                {{ selectedRecord.initialRisk.actionRequired }}
              </p>
            </div>

            <!-- Controls Applied -->
            <div class="rounded-lg border border-[#E2E8F0] bg-white p-4 space-y-2">
              <h3 class="text-xs font-semibold text-[#1E293B]">採行控制措施</h3>
              <ul
                v-if="selectedRecord.controlsApplied.length > 0"
                class="list-disc pl-4 space-y-1 text-xs text-[#334155]"
              >
                <li v-for="ctrl in selectedRecord.controlsApplied" :key="ctrl">
                  {{ ctrl }}
                </li>
              </ul>
              <p v-else class="text-xs text-[#94A3B8]">尚未填寫具體控制措施。</p>
            </div>

            <!-- Residual Risk Card -->
            <div class="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-xs font-semibold text-[#1E293B]">剩餘風險複評（Residual Risk）</h3>
                <div class="flex items-center gap-2">
                  <StatusBadge
                    v-if="selectedRecord.residualRisk"
                    :label="`${selectedRecord.residualRisk.probability}×${selectedRecord.residualRisk.severity}=${selectedRecord.residualRisk.score} (${selectedRecord.residualRisk.gradeLabel})`"
                    :tone="getToneByLevel(selectedRecord.residualRisk.riskLevel)"
                    :show-dot="false"
                  />
                  <span v-else class="text-xs text-[#94A3B8]">未填寫</span>
                </div>
              </div>

              <template v-if="selectedRecord.residualRisk">
                <div class="grid grid-cols-3 gap-2 text-xs text-[#475569]">
                  <div class="rounded bg-white border border-[#E2E8F0] px-3 py-2">
                    <span class="block text-[10px] text-[#64748B]">複評可能性 (P)</span>
                    <span class="font-semibold text-[#1E293B]">{{ selectedRecord.residualRisk.probability }}</span>
                  </div>
                  <div class="rounded bg-white border border-[#E2E8F0] px-3 py-2">
                    <span class="block text-[10px] text-[#64748B]">複評嚴重度 (S)</span>
                    <span class="font-semibold text-[#1E293B]">{{ selectedRecord.residualRisk.severity }}</span>
                  </div>
                  <div class="rounded bg-white border border-[#E2E8F0] px-3 py-2">
                    <span class="block text-[10px] text-[#64748B]">分數變化</span>
                    <span class="font-semibold text-[#0F766E]">
                      {{
                        selectedRecord.initialRisk.score > selectedRecord.residualRisk.score
                          ? `下降 ${selectedRecord.initialRisk.score - selectedRecord.residualRisk.score} 分`
                          : '無下降'
                      }}
                    </span>
                  </div>
                </div>
                <p class="text-xs text-[#334155] leading-relaxed bg-white border border-[#E2E8F0] rounded p-3">
                  <span class="font-semibold text-[#1E293B]">複評處置說明：</span>
                  {{ selectedRecord.residualRisk.actionRequired }}
                </p>
              </template>
            </div>

            <div class="flex items-center gap-2 text-[11px] text-[#64748B] px-1">
              <ShieldCheck class="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
              <span>已由使用者確認現場條件；本系統定位為自主學習與研究 PoC，不得取代法定作業安全許可。</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- Topic List View -->
    <template v-else>
      <!-- Top Banner & Summary -->
      <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <div class="flex items-start justify-between gap-4">
          <div class="space-y-1.5">
            <div class="inline-flex items-center gap-2 text-xs font-medium text-[#0F766E]">
              <Grid2x2 class="h-4 w-4" aria-hidden="true" />
              <span>5×5 風險矩陣評估主題庫</span>
            </div>
            <h2 class="text-xl font-bold text-[#1E293B]">風險評估紀錄</h2>
            <p class="text-xs text-[#475569] leading-relaxed max-w-3xl">
              以主題卡片形式整理每次 5×5 風險矩陣運算結果，點擊任一主題即可進入查看完整風險分析與 5×5 矩陣圖，並支援自訂名稱與刪除管理。
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

        <div class="grid grid-cols-3 gap-4 pt-2 border-t border-[#E2E8F0]">
          <div class="rounded-md bg-[#F8FAFC] border border-[#E2E8F0] px-4 py-3">
            <p class="text-[11px] text-[#64748B]">已保存評估主題</p>
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
            <p class="text-[11px] text-[#64748B]">已完成剩餘風險複評</p>
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
        <h3 class="text-sm font-semibold text-[#1E293B]">目前尚無已儲存的風險評估主題</h3>
        <p class="text-xs text-[#64748B] max-w-md mx-auto leading-relaxed">
          請先至「風險矩陣」頁面完成現場危害與防護條件確認並點擊計算，系統會自動建立評估主題於此處。
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

      <!-- Topic Grid Section -->
      <section v-else class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <!-- Filter Toolbar -->
        <div class="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div class="flex items-center gap-2.5 flex-1">
            <div class="relative flex-1 max-w-sm">
              <Search
                class="h-3.5 w-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                v-model="searchQuery"
                data-testid="records-search-input"
                type="text"
                placeholder="搜尋主題名稱、作業情境或危害項目..."
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
            <template v-if="!confirmClearAll">
              <button
                type="button"
                data-testid="records-clear-all-btn"
                class="px-3 py-1.5 rounded-md border border-[#E2E8F0] text-xs text-[#64748B] hover:text-[#DC2626] hover:border-[#FCA5A5] cursor-pointer"
                @click="confirmClearAll = true"
              >
                全部清除
              </button>
            </template>
            <div v-else class="inline-flex items-center gap-1.5">
              <button
                type="button"
                data-testid="records-confirm-clear-all-btn"
                class="px-3 py-1.5 rounded-md bg-[#DC2626] text-white text-xs font-medium hover:bg-[#B91C1C] cursor-pointer"
                @click="handleConfirmClearAll"
              >
                確定清空
              </button>
              <button
                type="button"
                class="px-2.5 py-1.5 rounded-md border border-[#E2E8F0] text-xs text-[#475569] hover:bg-slate-50 cursor-pointer"
                @click="confirmClearAll = false"
              >
                取消
              </button>
            </div>
          </div>
        </div>

        <!-- No Matches -->
        <div
          v-if="filteredRecords.length === 0"
          class="rounded-md border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center text-xs text-[#64748B]"
        >
          沒有符合搜尋或等級篩選條件的評估主題。
        </div>

        <!-- Topic Cards Grid (Clean Per-Topic Cards) -->
        <div v-else class="grid grid-cols-2 gap-4" data-testid="saved-records-list">
          <article
            v-for="rec in filteredRecords"
            :key="rec.id"
            data-testid="saved-record-item"
            class="group rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex flex-col justify-between gap-3 transition-colors hover:border-[#0F766E] hover:bg-white cursor-pointer"
            @click="openRecordDetail(rec.id)"
          >
            <div class="space-y-2.5">
              <!-- Topic Title + Card Actions -->
              <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0" @click.stop>
                  <div v-if="editingId === rec.id" class="flex items-center gap-1.5">
                    <input
                      v-model="editingName"
                      data-testid="rename-record-input"
                      type="text"
                      placeholder="輸入評估主題名稱..."
                      class="flex-1 rounded-md border border-[#0F766E] bg-white px-2.5 py-1 text-xs text-[#1E293B] focus:outline-none"
                      @keyup.enter="saveRename(rec.id)"
                      @keyup.escape="cancelRename"
                    />
                    <button
                      type="button"
                      data-testid="save-record-name-btn"
                      aria-label="儲存紀錄名稱"
                      class="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0F766E] text-white text-[11px] font-medium hover:bg-[#0D655E] cursor-pointer"
                      @click="saveRename(rec.id)"
                    >
                      <Check class="h-3 w-3" aria-hidden="true" />
                      <span>儲存</span>
                    </button>
                    <button
                      type="button"
                      aria-label="取消改名"
                      class="inline-flex items-center px-1.5 py-1 rounded border border-[#E2E8F0] bg-white text-[11px] text-[#475569] hover:bg-slate-50 cursor-pointer"
                      @click="cancelRename"
                    >
                      <X class="h-3 w-3" aria-hidden="true" />
                    </button>
                  </div>

                  <div
                    v-else
                    class="flex items-center gap-2 flex-wrap cursor-pointer"
                    @click="openRecordDetail(rec.id)"
                  >
                    <h3
                      data-testid="saved-record-title"
                      class="text-sm font-semibold text-[#1E293B] group-hover:text-[#0F766E] truncate"
                    >
                      {{ getDisplayName(rec) }}
                    </h3>
                    <span
                      v-if="rec.recordName"
                      class="inline-flex items-center px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] text-[10px] font-medium"
                    >
                      已自訂名稱
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0" @click.stop>
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

              <p class="text-[11px] text-[#64748B] truncate">
                情境：{{ rec.scenarioTitle }} ｜ 危害：{{ rec.hazardName }}
              </p>

              <!-- Compact Risk Badges -->
              <div class="flex items-center gap-2 flex-wrap">
                <StatusBadge
                  :label="`改善前 ${rec.initialRisk.probability}×${rec.initialRisk.severity}=${rec.initialRisk.score}`"
                  :tone="getToneByLevel(rec.initialRisk.riskLevel)"
                  :show-dot="false"
                />
                <span class="text-[11px] text-[#94A3B8]">→</span>
                <StatusBadge
                  v-if="rec.residualRisk"
                  :label="`剩餘 ${rec.residualRisk.probability}×${rec.residualRisk.severity}=${rec.residualRisk.score}`"
                  :tone="getToneByLevel(rec.residualRisk.riskLevel)"
                  :show-dot="false"
                />
                <span v-else class="text-[11px] text-[#94A3B8]">尚未複評</span>
              </div>
            </div>

            <!-- Footer Link Hint -->
            <div class="flex items-center justify-between pt-2.5 border-t border-[#E2E8F0] text-[11px]">
              <span class="text-[#94A3B8]">{{ formatDateTime(rec.evaluatedAt) }}</span>
              <span class="inline-flex items-center gap-1 font-medium text-[#0F766E]">
                <span>查看詳情與矩陣圖</span>
                <ArrowRight class="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </div>
          </article>
        </div>
      </section>
    </template>

    <!-- Single-Topic Markdown Report Preview -->
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
  </div>
</template>
