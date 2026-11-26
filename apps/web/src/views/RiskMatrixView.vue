<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  buildRiskAssessmentRecord,
  calculateRiskGrade,
  formatPreliminaryReportMarkdown,
  RISK_PROBABILITY_LEVELS,
  RISK_SEVERITY_LEVELS,
  type PreliminarySafetyReport,
  type RiskLevel,
  type RiskScaleValue,
} from '@safeagent/shared';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Grid2x2,
  Info,
  Plus,
  Trash2,
} from 'lucide-vue-next';
import RiskMatrixChart from '@/components/RiskMatrixChart.vue';
import StatusBadge, { type BadgeTone } from '@/components/StatusBadge.vue';
import { ApiClientError } from '@/services/api-client';
import { calculateRiskAssessment, generatePreliminaryReport } from '@/services/risk.service';
import { useRiskStore } from '@/stores/risk';

const riskStore = useRiskStore();

const likelihoodDescending = [...RISK_PROBABILITY_LEVELS].sort((a, b) => b.level - a.level);

const presetHazards = [
  {
    hazardName: '屋頂高處墜落（採光罩／邊緣）',
    scenarioTitle: '廠區頂樓排氣風車維修',
    initialProbability: 4 as RiskScaleValue,
    initialSeverity: 5 as RiskScaleValue,
    controlsApplied: '鋪設防踏穿踏板、架設安全母索、佩戴全身背負式安全帶與安全帽',
    residualProbability: 2 as RiskScaleValue,
    residualSeverity: 3 as RiskScaleValue,
  },
  {
    hazardName: '機械轉動部位捲夾（皮帶／葉輪）',
    scenarioTitle: '機械設備維修與保養',
    initialProbability: 4 as RiskScaleValue,
    initialSeverity: 4 as RiskScaleValue,
    controlsApplied: '停止機械運轉、切斷主電源並執行上鎖掛牌（LOTO）、確認靜止',
    residualProbability: 1 as RiskScaleValue,
    residualSeverity: 4 as RiskScaleValue,
  },
  {
    hazardName: '電氣設備感電危害（220V 馬達／配電盤）',
    scenarioTitle: '電氣設備作業',
    initialProbability: 3 as RiskScaleValue,
    initialSeverity: 5 as RiskScaleValue,
    controlsApplied: '停電上鎖掛牌、檢電確認無殘留電壓、設備接地與漏電斷路器、絕緣手套',
    residualProbability: 1 as RiskScaleValue,
    residualSeverity: 4 as RiskScaleValue,
  },
  {
    hazardName: '化學品管線誤接與有毒蒸氣暴露',
    scenarioTitle: '化學品輸送管線作業',
    initialProbability: 3 as RiskScaleValue,
    initialSeverity: 5 as RiskScaleValue,
    controlsApplied: '核對 SDS 與相容性、防誤接標示、洩壓排空盲封隔離、配戴化學防護具',
    residualProbability: 1 as RiskScaleValue,
    residualSeverity: 3 as RiskScaleValue,
  },
];

const recordName = ref('');
const scenarioTitle = ref('廠區頂樓排氣風車維修');
const hazardName = ref('');
const initialProbability = ref<RiskScaleValue>(4);
const initialSeverity = ref<RiskScaleValue>(4);
const controlsText = ref('');
const includeResidual = ref(true);
const residualProbability = ref<RiskScaleValue>(2);
const residualSeverity = ref<RiskScaleValue>(3);
const userConfirmed = ref(false);
const activeCellTarget = ref<'initial' | 'residual'>('initial');

const isSubmitting = ref(false);
const calculationModeLabel = ref<string | null>(null);
const formError = ref<string | null>(null);
const generatedReport = ref<PreliminarySafetyReport | null>(null);
const copiedReport = ref(false);

const initialPreview = computed(() =>
  calculateRiskGrade(initialProbability.value, initialSeverity.value),
);

const residualPreview = computed(() =>
  includeResidual.value
    ? calculateRiskGrade(residualProbability.value, residualSeverity.value)
    : null,
);

function getToneByLevel(level: RiskLevel): BadgeTone {
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'warning';
  return 'success';
}

function getCellClasses(probability: RiskScaleValue, severity: RiskScaleValue) {
  const grade = calculateRiskGrade(probability, severity);
  const isInitialSelected =
    initialProbability.value === probability && initialSeverity.value === severity;
  const isResidualSelected =
    includeResidual.value &&
    residualProbability.value === probability &&
    residualSeverity.value === severity;

  const base =
    grade.riskLevel === 'high'
      ? 'bg-red-50 border-red-200 text-[#DC2626]'
      : grade.riskLevel === 'medium'
        ? 'bg-amber-50 border-amber-200 text-[#D97706]'
        : 'bg-emerald-50 border-emerald-200 text-[#16A34A]';

  const ring = isInitialSelected
    ? 'ring-2 ring-[#DC2626] ring-inset'
    : isResidualSelected
      ? 'ring-2 ring-[#0F766E] ring-inset'
      : '';

  return { grade, classes: `${base} ${ring}`, isInitialSelected, isResidualSelected };
}

function handleMatrixCellClick(probability: RiskScaleValue, severity: RiskScaleValue) {
  if (activeCellTarget.value === 'initial') {
    initialProbability.value = probability;
    initialSeverity.value = severity;
  } else {
    includeResidual.value = true;
    residualProbability.value = probability;
    residualSeverity.value = severity;
  }
}

function applyPreset(preset: (typeof presetHazards)[number]) {
  scenarioTitle.value = preset.scenarioTitle;
  hazardName.value = preset.hazardName;
  initialProbability.value = preset.initialProbability;
  initialSeverity.value = preset.initialSeverity;
  controlsText.value = preset.controlsApplied;
  includeResidual.value = true;
  residualProbability.value = preset.residualProbability;
  residualSeverity.value = preset.residualSeverity;
  formError.value = null;
}

async function handleAddAssessment(): Promise<void> {
  formError.value = null;
  if (!hazardName.value.trim() || !scenarioTitle.value.trim()) {
    formError.value = '請填寫作業情境名稱與危害項目名稱。';
    return;
  }
  if (!userConfirmed.value) {
    formError.value = '請先勾選確認現場作業條件與人工判定風險等級，系統不得自動產出未確認分數。';
    return;
  }

  const controlsApplied = controlsText.value
    .split(/[、,，\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const trimmedRecordName = recordName.value.trim();

  const payload = {
    ...(trimmedRecordName ? { recordName: trimmedRecordName } : {}),
    hazardName: hazardName.value.trim(),
    scenarioTitle: scenarioTitle.value.trim(),
    initialProbability: initialProbability.value,
    initialSeverity: initialSeverity.value,
    controlsApplied,
    ...(includeResidual.value
      ? {
          residualProbability: residualProbability.value,
          residualSeverity: residualSeverity.value,
        }
      : {}),
    userConfirmed: true,
  };

  isSubmitting.value = true;
  try {
    const record = await calculateRiskAssessment(payload);
    riskStore.addRecord(
      trimmedRecordName && !record.recordName ? { ...record, recordName: trimmedRecordName } : record,
    );
    recordName.value = '';
    calculationModeLabel.value = '已透過後端確定性規則 API 計算並保存至評估紀錄';
  } catch (err) {
    if (err instanceof ApiClientError && (err.isNetworkError || err.isTimeout)) {
      const localRecord = buildRiskAssessmentRecord(payload);
      riskStore.addRecord(localRecord);
      recordName.value = '';
      calculationModeLabel.value = '後端未連線，已使用共用確定性 5×5 規則本機計算並保存';
    } else {
      formError.value = err instanceof ApiClientError ? err.message : '計算風險評估失敗';
    }
  } finally {
    isSubmitting.value = false;
  }
}

async function handleGenerateReport(): Promise<void> {
  if (riskStore.records.length === 0) return;

  const draft = riskStore.workspaceDraft;
  const reportInput = {
    scenarioTitle: scenarioTitle.value.trim() || 'SafeAgent 作業風險評估',
    scenarioSummary:
      draft?.scenarioSummary ||
      `共完成 ${riskStore.records.length} 項經人工確認現場條件之 5×5 風險矩陣評估紀錄。`,
    hazards:
      draft?.hazards ??
      riskStore.records.map((rec) => ({
        hazardType: rec.hazardName,
        description: `作業情境「${rec.scenarioTitle}」之人工確認危害項目`,
        potentialConsequence: rec.initialRisk.gradeLabel,
        recommendedControls: rec.controlsApplied,
        relatedRegulations: ['勞動部職業安全衛生署《風險評估指引》'],
      })),
    riskRecords: riskStore.records,
  };

  try {
    generatedReport.value = await generatePreliminaryReport(reportInput);
  } catch {
    generatedReport.value = formatPreliminaryReportMarkdown(reportInput);
  }
  copiedReport.value = false;
}

async function handleCopyMarkdown(): Promise<void> {
  if (!generatedReport.value || typeof navigator === 'undefined' || !navigator.clipboard) return;
  await navigator.clipboard.writeText(generatedReport.value.markdownContent);
  copiedReport.value = true;
}

function handleDownloadMarkdown(): void {
  if (!generatedReport.value) return;
  const blob = new Blob([generatedReport.value.markdownContent], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `safeagent-risk-report-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  if (riskStore.workspaceDraft) {
    scenarioTitle.value = riskStore.workspaceDraft.scenarioTitle;
    const firstHazard = riskStore.workspaceDraft.hazards[0];
    if (firstHazard && !hazardName.value) {
      hazardName.value = firstHazard.hazardType;
      controlsText.value = firstHazard.recommendedControls.join('、');
    }
  }
});
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">5×5 風險矩陣與初步評估報告（Risk Matrix）</h2>
          <StatusBadge label="Day 4 已啟用・人工確認規則 + ECharts" tone="success" />
        </div>
        <p class="text-sm text-[#64748B]">
          依據勞動部職業安全衛生署《風險評估指引》實作確定性 5×5 計算規則（可能性 × 嚴重度），記錄改善前風險與剩餘風險並以 Apache ECharts 視覺化呈現。
        </p>
      </div>
    </section>

    <!-- Official Guideline Rule Notice -->
    <div class="rounded-lg border border-teal-200 bg-teal-50/60 px-4 py-3 flex items-start gap-2.5 text-xs text-[#334155]">
      <Info class="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
      <div class="space-y-1">
        <div>
          <strong>分級計算基準（依職安署《風險評估指引》PoC 示範規則）：</strong>
          分數 = 可能性 (1–5) × 嚴重度 (1–5)。
          <span class="text-[#16A34A] font-semibold">1–5 分：低風險（可接受風險）</span>；
          <span class="text-[#D97706] font-semibold">6–14 分：中風險（須積極降低風險）</span>；
          <span class="text-[#DC2626] font-semibold">15–25 分：高風險（不可接受風險，改善前不應作業）</span>。
        </div>
        <div class="text-[#475569]">
          依研究安全規範，風險分數不得由 LLM 擅自決定，必須由使用者確認現場作業條件後計算記錄；本頁面亦非正式作業安全許可。
        </div>
      </div>
    </div>

    <!-- Main 2-Column Workspace -->
    <div class="grid grid-cols-12 gap-6 items-start">
      <!-- Left: ECharts + Interactive 5x5 Matrix Table -->
      <section class="col-span-7 space-y-5">
        <RiskMatrixChart :records="riskStore.records" />

        <div class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
              <Grid2x2 class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
              <span>互動式 5×5 風險矩陣對照表（點擊格位填入左側表單）</span>
            </h3>
            <div class="inline-flex rounded border border-[#E2E8F0] bg-[#F8FAFC] p-0.5 text-[11px]">
              <button
                type="button"
                class="px-2.5 py-1 rounded cursor-pointer font-medium"
                :class="activeCellTarget === 'initial' ? 'bg-[#DC2626] text-white' : 'text-[#475569]'"
                @click="activeCellTarget = 'initial'"
              >
                設定改善前 (P×S)
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded cursor-pointer font-medium"
                :class="activeCellTarget === 'residual' ? 'bg-[#0F766E] text-white' : 'text-[#475569]'"
                @click="activeCellTarget = 'residual'"
              >
                設定剩餘 (P×S)
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th class="border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-left text-[#475569] font-semibold w-28">
                    可能性 \ 嚴重度
                  </th>
                  <th
                    v-for="sev in RISK_SEVERITY_LEVELS"
                    :key="sev.level"
                    class="border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-center text-[#1E293B] font-semibold"
                  >
                    {{ sev.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="lik in likelihoodDescending" :key="lik.level">
                  <th class="border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-left text-[#1E293B] font-semibold">
                    {{ lik.label }}
                  </th>
                  <td v-for="sev in RISK_SEVERITY_LEVELS" :key="`${lik.level}-${sev.level}`" class="p-0">
                    <button
                      type="button"
                      :data-testid="`matrix-cell-${lik.level}-${sev.level}`"
                      class="w-full h-full border border-[#E2E8F0] p-2 text-center transition-all cursor-pointer hover:opacity-90"
                      :class="getCellClasses(lik.level, sev.level).classes"
                      @click="handleMatrixCellClick(lik.level, sev.level)"
                    >
                      <div class="font-bold text-xs">
                        {{ getCellClasses(lik.level, sev.level).grade.score }} 分
                      </div>
                      <div class="text-[10px] mt-0.5">
                        {{
                          getCellClasses(lik.level, sev.level).grade.riskLevel === 'high'
                            ? '高風險'
                            : getCellClasses(lik.level, sev.level).grade.riskLevel === 'medium'
                              ? '中風險'
                              : '低風險'
                        }}
                      </div>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Right: User-Confirmed Assessment Form -->
      <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4">
        <div class="space-y-2 border-b border-[#E2E8F0] pb-3">
          <h3 class="text-sm font-semibold text-[#1E293B]">人工確認風險評估輸入</h3>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="preset in presetHazards"
              :key="preset.hazardName"
              type="button"
              class="text-[11px] px-2.5 py-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#334155] hover:border-[#0F766E] hover:text-[#0F766E] cursor-pointer"
              @click="applyPreset(preset)"
            >
              + {{ preset.hazardName.split('（')[0] }}
            </button>
          </div>
        </div>

        <form class="space-y-3.5 text-xs" @submit.prevent="handleAddAssessment">
          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="risk-record-name">
              紀錄名稱（選填）
            </label>
            <input
              id="risk-record-name"
              v-model="recordName"
              data-testid="risk-record-name-input"
              type="text"
              placeholder="例如：11/26 A棟頂樓風車維修初評（未填將顯示情境與危害名稱）"
              class="w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-xs text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="risk-scenario-title">作業情境名稱</label>
            <input
              id="risk-scenario-title"
              v-model="scenarioTitle"
              data-testid="risk-scenario-input"
              type="text"
              class="w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-xs text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="risk-hazard-name">危害項目名稱</label>
            <input
              id="risk-hazard-name"
              v-model="hazardName"
              data-testid="risk-hazard-input"
              type="text"
              placeholder="例如：屋頂高處墜落（採光罩／邊緣）"
              class="w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-xs text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <!-- Initial Risk -->
          <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-[#1E293B]">改善前風險（Initial Risk）</span>
              <StatusBadge
                :label="`${initialPreview.score} 分・${initialPreview.gradeLabel}`"
                :tone="getToneByLevel(initialPreview.riskLevel)"
                :show-dot="false"
              />
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] text-[#64748B] mb-1" for="initial-p">可能性 (P)</label>
                <select
                  id="initial-p"
                  v-model.number="initialProbability"
                  class="w-full rounded border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option v-for="item in RISK_PROBABILITY_LEVELS" :key="item.level" :value="item.level">
                    {{ item.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-[#64748B] mb-1" for="initial-s">嚴重度 (S)</label>
                <select
                  id="initial-s"
                  v-model.number="initialSeverity"
                  class="w-full rounded border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option v-for="item in RISK_SEVERITY_LEVELS" :key="item.level" :value="item.level">
                    {{ item.label }}
                  </option>
                </select>
              </div>
            </div>
            <p class="text-[11px] text-[#475569]">{{ initialPreview.actionRequired }}</p>
          </div>

          <!-- Controls -->
          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="risk-controls-input">
              採行控制措施（以頓號或逗號分隔）
            </label>
            <textarea
              id="risk-controls-input"
              v-model="controlsText"
              rows="2"
              placeholder="例如：停止機械運轉、切斷電源並上鎖掛牌（LOTO）"
              class="w-full rounded-md border border-[#CBD5E1] px-3 py-2 text-xs text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <!-- Residual Risk -->
          <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <label class="inline-flex items-center gap-1.5 font-semibold text-[#1E293B] cursor-pointer">
                <input v-model="includeResidual" type="checkbox" class="rounded border-[#CBD5E1]" />
                <span>剩餘風險（Residual Risk）</span>
              </label>
              <StatusBadge
                v-if="residualPreview"
                :label="`${residualPreview.score} 分・${residualPreview.gradeLabel}`"
                :tone="getToneByLevel(residualPreview.riskLevel)"
                :show-dot="false"
              />
            </div>
            <div v-if="includeResidual" class="grid grid-cols-2 gap-2.5">
              <div>
                <label class="block text-[11px] text-[#64748B] mb-1" for="residual-p">改善後可能性 (P)</label>
                <select
                  id="residual-p"
                  v-model.number="residualProbability"
                  class="w-full rounded border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option v-for="item in RISK_PROBABILITY_LEVELS" :key="item.level" :value="item.level">
                    {{ item.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-[11px] text-[#64748B] mb-1" for="residual-s">改善後嚴重度 (S)</label>
                <select
                  id="residual-s"
                  v-model.number="residualSeverity"
                  class="w-full rounded border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-xs"
                >
                  <option v-for="item in RISK_SEVERITY_LEVELS" :key="item.level" :value="item.level">
                    {{ item.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <!-- Mandatory User Confirmation Checkbox -->
          <label class="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50/70 p-3 cursor-pointer">
            <input
              v-model="userConfirmed"
              data-testid="user-confirmed-checkbox"
              type="checkbox"
              class="mt-0.5 rounded border-[#CBD5E1]"
            />
            <span class="text-[11px] text-[#334155] leading-relaxed">
              我已確認上述作業現場條件與防護現況，並由人工確認可能性與嚴重度評分（系統不得由 AI 未經確認自行給分）。
            </span>
          </label>

          <p v-if="formError" data-testid="risk-form-error" class="text-xs text-[#DC2626] font-medium">
            {{ formError }}
          </p>

          <p v-if="calculationModeLabel" class="text-[11px] text-[#0F766E] flex items-center gap-1">
            <CheckCircle2 class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{{ calculationModeLabel }}</span>
          </p>

          <button
            type="submit"
            :disabled="isSubmitting"
            data-testid="add-risk-record-btn"
            class="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md bg-[#0F766E] text-white text-xs font-semibold hover:bg-[#0D655E] transition-colors cursor-pointer disabled:opacity-60"
          >
            <Plus class="h-4 w-4" aria-hidden="true" />
            <span>{{ isSubmitting ? '計算記錄中...' : '計算並加入風險評估紀錄' }}</span>
          </button>
        </form>
      </section>
    </div>

    <!-- Assessment Records Table & Structured Report -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 class="text-sm font-semibold text-[#1E293B]">
            改善前與剩餘風險評估紀錄表（共 {{ riskStore.records.length }} 筆）
          </h3>
          <p class="text-xs text-[#64748B] mt-0.5">
            每筆紀錄皆經人工確認現場條件並標示改善前後分數變化，可一鍵產出結構化 Markdown 初步評估報告。
          </p>
        </div>

        <div class="flex items-center gap-2">
          <a
            href="#/risk-records"
            class="inline-flex items-center gap-1 px-3 py-2 rounded-md border border-[#CBD5E1] text-xs font-medium text-[#1E293B] hover:border-[#0F766E] hover:text-[#0F766E]"
          >
            前往紀錄管理頁
          </a>
          <button
            type="button"
            :disabled="riskStore.records.length === 0"
            data-testid="generate-risk-report-btn"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed"
            @click="handleGenerateReport"
          >
            <FileText class="h-3.5 w-3.5" aria-hidden="true" />
            <span>產出初步評估報告</span>
          </button>
          <button
            v-if="riskStore.records.length > 0"
            type="button"
            class="px-3 py-2 rounded-md border border-[#E2E8F0] text-xs text-[#475569] hover:bg-slate-50 cursor-pointer"
            @click="riskStore.clearRecords()"
          >
            全部清除
          </button>
        </div>
      </div>

      <div
        v-if="riskStore.records.length === 0"
        data-testid="risk-records-empty"
        class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-8 text-center text-xs text-[#64748B]"
      >
        尚未有經人工確認的風險評估紀錄，請由上方表單選擇或輸入現場條件後新增。
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full border-collapse text-xs" data-testid="risk-records-table">
          <thead>
            <tr class="bg-[#F8FAFC] text-[#475569] text-left">
              <th class="border border-[#E2E8F0] px-3 py-2 font-semibold">作業情境</th>
              <th class="border border-[#E2E8F0] px-3 py-2 font-semibold">危害項目</th>
              <th class="border border-[#E2E8F0] px-3 py-2 font-semibold">改善前風險</th>
              <th class="border border-[#E2E8F0] px-3 py-2 font-semibold">採行控制措施</th>
              <th class="border border-[#E2E8F0] px-3 py-2 font-semibold">剩餘風險</th>
              <th class="border border-[#E2E8F0] px-3 py-2 font-semibold w-16 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rec in riskStore.records" :key="rec.id" class="hover:bg-[#F8FAFC]">
              <td class="border border-[#E2E8F0] px-3 py-2.5 text-[#1E293B]">
                <span
                  v-if="rec.recordName"
                  class="inline-block mb-1 mr-1.5 px-1.5 py-0.5 rounded bg-[#CCFBF1] text-[#0F766E] text-[10px] font-medium"
                >
                  {{ rec.recordName }}
                </span>
                <span>{{ rec.scenarioTitle }}</span>
              </td>
              <td class="border border-[#E2E8F0] px-3 py-2.5 font-medium text-[#1E293B]">{{ rec.hazardName }}</td>
              <td class="border border-[#E2E8F0] px-3 py-2.5">
                <StatusBadge
                  :label="`${rec.initialRisk.probability}×${rec.initialRisk.severity}=${rec.initialRisk.score} (${rec.initialRisk.gradeLabel})`"
                  :tone="getToneByLevel(rec.initialRisk.riskLevel)"
                  :show-dot="false"
                />
              </td>
              <td class="border border-[#E2E8F0] px-3 py-2.5 text-[#475569]">
                {{ rec.controlsApplied.length > 0 ? rec.controlsApplied.join('、') : '—' }}
              </td>
              <td class="border border-[#E2E8F0] px-3 py-2.5">
                <StatusBadge
                  v-if="rec.residualRisk"
                  :label="`${rec.residualRisk.probability}×${rec.residualRisk.severity}=${rec.residualRisk.score} (${rec.residualRisk.gradeLabel})`"
                  :tone="getToneByLevel(rec.residualRisk.riskLevel)"
                  :show-dot="false"
                />
                <span v-else class="text-[#94A3B8]">未填寫</span>
              </td>
              <td class="border border-[#E2E8F0] px-3 py-2.5 text-center">
                <button
                  type="button"
                  aria-label="刪除此評估紀錄"
                  class="p-1 text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                  @click="riskStore.removeRecord(rec.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Preliminary Report Preview -->
      <div
        v-if="generatedReport"
        data-testid="risk-report-preview"
        class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3"
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
        <pre class="text-xs font-mono text-[#334155] bg-white border border-[#E2E8F0] rounded p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ generatedReport.markdownContent }}</pre>
      </div>
    </section>
  </div>
</template>
