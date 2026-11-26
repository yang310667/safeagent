<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { EvaluationCaseResult, EvaluationReportResponse } from '@safeagent/shared';
import {
  AlertOctagon,
  Calculator,
  CheckCircle2,
  Clock,
  FileSearch,
  FlaskConical,
  HelpCircle,
  Link2,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-vue-next';
import StatusBadge, { type BadgeTone } from '@/components/StatusBadge.vue';
import { ApiClientError } from '@/services/api-client';
import {
  fetchEvaluationReport,
  runEvaluationBenchmarkCase,
} from '@/services/evaluation.service';
import { useSystemStore } from '@/stores/system';

const systemStore = useSystemStore();

const report = ref<EvaluationReportResponse | null>(null);
const isLoading = ref(false);
const runningCaseId = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const runErrorMessage = ref<string | null>(null);
let activeController: AbortController | null = null;

const criterionIcons = {
  hazardCompleteness: CheckCircle2,
  regulationAccuracy: FileSearch,
  sourceTraceability: Link2,
  riskCalculationAccuracy: Calculator,
  clarificationCapability: HelpCircle,
  hallucinationControl: AlertOctagon,
};

const isAgentEnabled = computed(() => Boolean(systemStore.config?.agentEnabled));

function getMetricTone(passRate: number, totalCount: number): BadgeTone {
  if (totalCount === 0) return 'neutral';
  if (passRate >= 80) return 'success';
  if (passRate >= 60) return 'warning';
  return 'danger';
}

function getPassedChecksCount(res: EvaluationCaseResult): number {
  return Object.values(res.checks).filter(Boolean).length;
}

async function loadEvaluation(): Promise<void> {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;

  isLoading.value = true;
  errorMessage.value = null;

  try {
    report.value = await fetchEvaluationReport(undefined, controller.signal);
  } catch (err) {
    if (err instanceof ApiClientError && err.code === 'REQUEST_ABORTED') {
      return;
    }
    errorMessage.value =
      err instanceof ApiClientError
        ? `${err.message}（請確認後端 Worker API 是否已啟動）`
        : '載入評估與測試資料失敗';
  } finally {
    if (activeController === controller) {
      isLoading.value = false;
      activeController = null;
    }
  }
}

async function handleRunSingleCase(caseId: string): Promise<void> {
  if (!isAgentEnabled.value || runningCaseId.value) return;
  runningCaseId.value = caseId;
  runErrorMessage.value = null;

  try {
    const newResult = await runEvaluationBenchmarkCase(caseId);
    if (report.value) {
      const existing = report.value.caseResults.filter((item) => item.caseId !== caseId);
      const updatedResults = [...existing, newResult];
      const total = updatedResults.length;
      const updatedMetrics = report.value.criteriaMetrics.map((metric) => {
        const passed = updatedResults.filter((item) => item.checks[metric.key]).length;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        return {
          ...metric,
          passedCount: passed,
          totalCount: total,
          passRate,
          summary: `實測 ${passed}/${total} 筆通過（${passRate}%）`,
        };
      });
      report.value = {
        ...report.value,
        hasExecutedRun: true,
        executedAt: newResult.executedAt,
        model: newResult.model,
        criteriaMetrics: updatedMetrics,
        caseResults: updatedResults,
      };
    }
  } catch (err) {
    runErrorMessage.value =
      err instanceof ApiClientError ? err.message : '執行即時基準案例失敗';
  } finally {
    runningCaseId.value = null;
  }
}

onMounted(() => {
  void loadEvaluation();
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
          <h2 class="text-lg font-semibold text-[#1E293B]">Agent 評估與測試（Evaluation Framework）</h2>
          <StatusBadge
            :label="
              report?.hasExecutedRun
                ? `已完成基準實測（${report.caseResults.length} 筆案例）`
                : '基準測試集就緒・待執行實測'
            "
            :tone="report?.hasExecutedRun ? 'success' : 'warning'"
          />
        </div>
        <p class="text-sm text-[#64748B]">
          針對 SafeAgent 的危害辨識完整性、法規引用正確性、來源可追溯性、風險計算、追問能力與無依據內容抑制進行基準實測與紀錄。
        </p>
      </div>

      <div v-if="report?.hasExecutedRun" class="text-right text-xs text-[#475569] shrink-0 space-y-1">
        <div>
          實測模型：<span class="font-mono font-semibold text-[#0F766E]">{{ report.model }}</span>
        </div>
        <div class="text-[11px] text-[#64748B]">
          執行時間：{{ report.executedAt }}
        </div>
      </div>
    </section>

    <!-- Error / Offline State -->
    <section
      v-if="errorMessage"
      data-testid="evaluation-error-state"
      class="bg-white border border-red-200 rounded-lg p-8 text-center space-y-3"
    >
      <div class="text-sm font-semibold text-[#DC2626]">{{ errorMessage }}</div>
      <p class="text-xs text-[#64748B]">
        為避免顯示虛構量化分數，評估結果均自後端讀取真實測試紀錄。啟動後端 API 後即可檢視。
      </p>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] cursor-pointer"
        @click="loadEvaluation"
      >
        <RefreshCw class="h-3.5 w-3.5" aria-hidden="true" />
        <span>重新載入</span>
      </button>
    </section>

    <section
      v-else-if="isLoading"
      class="bg-white border border-[#E2E8F0] rounded-lg p-10 text-center text-sm text-[#64748B]"
    >
      正在載入評估框架與基準測試結果...
    </section>

    <template v-else-if="report">
      <!-- 6 Evaluation Criteria Metrics -->
      <section class="grid grid-cols-3 gap-4" data-testid="evaluation-criteria-grid">
        <div
          v-for="metric in report.criteriaMetrics"
          :key="metric.key"
          class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="h-8 w-8 rounded-md bg-teal-50 text-[#0F766E] border border-teal-100 flex items-center justify-center">
              <component :is="criterionIcons[metric.key]" class="h-4 w-4" aria-hidden="true" />
            </div>
            <StatusBadge
              :label="metric.totalCount > 0 ? `${metric.passRate}% (${metric.passedCount}/${metric.totalCount})` : '尚未實測'"
              :tone="getMetricTone(metric.passRate, metric.totalCount)"
              :show-dot="false"
            />
          </div>
          <h3 class="text-sm font-semibold text-[#1E293B]">{{ metric.title }}</h3>
          <div class="pt-2 border-t border-[#F1F5F9] text-xs text-[#475569]">
            {{ metric.summary }}
          </div>
        </div>
      </section>

      <!-- Benchmark Case Breakdown -->
      <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div>
            <h3 class="text-sm font-semibold text-[#1E293B]">
              基準測試案例集與實測明細（共 {{ report.benchmarkCases.length }} 題）
            </h3>
            <p class="text-xs text-[#64748B] mt-0.5">
              涵蓋屋頂風車維修、施工架高處作業、輸送帶捲夾、低壓配電盤與化學品管線拆裝五大情境。
            </p>
          </div>
          <span v-if="!isAgentEnabled" class="text-[11px] text-[#64748B]">
            （Live Agent 未啟用時僅檢視已保存紀錄）
          </span>
        </div>

        <p v-if="runErrorMessage" class="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded px-3 py-2">
          {{ runErrorMessage }}
        </p>

        <div class="space-y-3" data-testid="evaluation-case-list">
          <div
            v-for="bench in report.benchmarkCases"
            :key="bench.id"
            class="border border-[#E2E8F0] rounded-md p-4 bg-[#F8FAFC]/60 space-y-2.5"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-[#1E293B]">{{ bench.title }}</span>
                  <span class="text-[11px] font-mono text-[#64748B]">{{ bench.id }}</span>
                </div>
                <p class="text-xs text-[#475569]">測試輸入：{{ bench.prompt }}</p>
              </div>

              <button
                type="button"
                :disabled="!isAgentEnabled || runningCaseId !== null"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium shrink-0 transition-colors"
                :class="
                  isAgentEnabled && runningCaseId === null
                    ? 'bg-[#0F766E] text-white hover:bg-[#0D655E] cursor-pointer'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                "
                @click="handleRunSingleCase(bench.id)"
              >
                <Loader2 v-if="runningCaseId === bench.id" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <Play v-else class="h-3.5 w-3.5" aria-hidden="true" />
                <span>{{ runningCaseId === bench.id ? '實測中...' : '即時重測此題' }}</span>
              </button>
            </div>

            <!-- Matched recorded result -->
            <template
              v-for="res in report.caseResults.filter((r) => r.caseId === bench.id)"
              :key="res.caseId"
            >
              <div class="bg-white border border-[#E2E8F0] rounded p-3 space-y-2 text-xs">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <StatusBadge
                      :label="`通過 ${getPassedChecksCount(res)}/6 項`"
                      :tone="getPassedChecksCount(res) === 6 ? 'success' : 'warning'"
                      :show-dot="false"
                    />
                    <span class="text-[11px] text-[#64748B] flex items-center gap-1">
                      <Clock class="h-3 w-3" aria-hidden="true" />
                      <span>{{ res.durationMs }} ms</span>
                    </span>
                    <span class="text-[11px] text-[#64748B]">
                      呼叫工具：{{ res.toolNamesUsed.join('、') || '無' }}
                    </span>
                    <span class="text-[11px] text-[#64748B]">
                      引用來源：{{ res.referenceSourceCount }} 筆
                    </span>
                  </div>
                </div>

                <p class="text-[#334155] leading-relaxed">回覆摘要：{{ res.replyExcerpt }}...</p>

                <div class="flex flex-wrap gap-2 text-[11px]">
                  <span
                    v-for="(passed, key) in res.checks"
                    :key="key"
                    class="px-2 py-0.5 rounded border"
                    :class="
                      passed
                        ? 'bg-emerald-50 border-emerald-200 text-[#16A34A]'
                        : 'bg-red-50 border-red-200 text-[#DC2626]'
                    "
                  >
                    {{ key }}: {{ passed ? 'PASS' : 'FAIL' }}
                  </span>
                </div>

                <div class="text-[11px] text-[#64748B]">
                  檢核備註：{{ res.notes.join('；') }}
                </div>
              </div>
            </template>
          </div>
        </div>
      </section>
    </template>

    <!-- Notice -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-center gap-3 text-xs text-[#64748B]">
      <FlaskConical class="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
      <span>
        誠實原則聲明：本頁呈現之通過率與耗時均源自實際對基準案例集執行程式化檢核與模型呼叫之觀察紀錄，不包含任何虛構數據。
      </span>
    </section>
  </div>
</template>
