<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import type {
  AgentStructuredAnalysis,
  AgentToolName,
  AgentToolTraceItem,
  ReferenceSourceItem,
  ScenarioPreset,
} from '@safeagent/shared';
import {
  AlertCircle,
  BookMarked,
  Bot,
  CheckCircle2,
  Clock,
  Eraser,
  ExternalLink,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Play,
  Send,
  ShieldAlert,
  Terminal,
  Wrench,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { sendAgentChat } from '@/services/agent.service';
import { ApiClientError } from '@/services/api-client';
import { useSystemStore } from '@/stores/system';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
}

const systemStore = useSystemStore();

const scenarioPresets: ScenarioPreset[] = [
  {
    id: 'exhaust-fan-maintenance',
    title: '廠區頂樓排氣風車維修',
    category: '設備維修 / 屋頂作業',
    description:
      '預計於廠區頂樓進行空氣污染防制設備排氣風車軸承與皮帶更換作業，作業高度鄰近屋頂女兒牆，現場風速較高且設備需斷電隔離。',
    disclaimer: '測試用假設性作業描述，非真實職災案例。',
  },
  {
    id: 'work-at-height',
    title: '高處作業',
    category: '墜落危害 / 施工架',
    description:
      '作業人員需於距離地面約 4.5 公尺之固定式施工架上進行管線支架固定與焊接前準備作業，作業期間需攜帶手工具。',
    disclaimer: '測試用假設性作業描述，非真實職災案例。',
  },
  {
    id: 'machinery-maintenance',
    title: '機械設備維修',
    category: '捲夾危害 / 上鎖掛牌',
    description:
      '進行產線輸送帶滾筒清潔與傳動齒輪組潤滑保養作業，人員手部需接近傳動機構內部進行檢查。',
    disclaimer: '測試用假設性作業描述，非真實職災案例。',
  },
  {
    id: 'electrical-work',
    title: '電氣設備作業',
    category: '感電危害 / 配電盤',
    description:
      '預計對廠房低壓配電盤進行紅外線測溫巡檢與接線端子緊固作業，部分鄰近匯流排可能處於帶電狀態。',
    disclaimer: '測試用假設性作業描述，非真實職災案例。',
  },
  {
    id: 'chemical-piping',
    title: '化學品輸送管線作業',
    category: '化學品危害 / 管線拆裝',
    description:
      '預計拆換酸性清洗劑輸送管線法蘭墊片，管線連接儲槽與製程端，作業前需確認管內殘餘液體排空與個人防護具配置。',
    disclaimer: '測試用假設性作業描述，非真實職災案例。',
  },
];

const reservedTools: Array<{ name: AgentToolName; label: string; enabledInDay3: boolean }> = [
  { name: 'search_safety_knowledge', label: '職安知識庫檢索', enabledInDay3: true },
  { name: 'search_accident_cases', label: '職災案例檢索', enabledInDay3: true },
  { name: 'identify_hazards', label: '危害辨識輔助', enabledInDay3: true },
  { name: 'calculate_risk', label: '風險等級計算（Day 4）', enabledInDay3: false },
  { name: 'generate_report', label: '初步報告產出（Day 4）', enabledInDay3: false },
];

const selectedScenarioId = ref<string | null>(null);
const promptInput = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const conversationId = ref<string | null>(null);
const messages = ref<ConversationMessage[]>([]);
const analysis = ref<AgentStructuredAnalysis | null>(null);
const toolTraces = ref<AgentToolTraceItem[]>([]);
const referenceSources = ref<ReferenceSourceItem[]>([]);

const isAnalyzing = ref(false);
const errorMessage = ref<string | null>(null);
let activeController: AbortController | null = null;

const isAgentEnabled = computed(() => Boolean(systemStore.config?.agentEnabled));
const isDemoEnabled = computed(() => Boolean(systemStore.config?.demoEnabled));
const canSubmit = computed(
  () => isAgentEnabled.value && promptInput.value.trim().length > 0 && !isAnalyzing.value,
);

function handleSelectScenario(scenario: ScenarioPreset) {
  selectedScenarioId.value = scenario.id;
  promptInput.value = scenario.description;
  errorMessage.value = null;
}

function handleUseClarificationQuestion(question: string) {
  const prefix = `針對「${question}」補充說明：`;
  promptInput.value = promptInput.value.trim() ? `${promptInput.value.trim()}\n${prefix}` : prefix;
  textareaRef.value?.focus();
}

function handleClearConversation() {
  activeController?.abort();
  activeController = null;
  selectedScenarioId.value = null;
  promptInput.value = '';
  conversationId.value = null;
  messages.value = [];
  analysis.value = null;
  toolTraces.value = [];
  referenceSources.value = [];
  errorMessage.value = null;
  isAnalyzing.value = false;
}

async function handleSubmitAnalysis() {
  const trimmed = promptInput.value.trim();
  if (!isAgentEnabled.value || !trimmed || isAnalyzing.value) {
    return;
  }

  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;

  errorMessage.value = null;
  isAnalyzing.value = true;

  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content: trimmed,
  });
  promptInput.value = '';

  try {
    const response = await sendAgentChat(
      {
        message: trimmed,
        conversationId: conversationId.value,
      },
      undefined,
      controller.signal,
    );

    conversationId.value = response.conversationId;
    messages.value.push({
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.reply,
      model: response.model,
    });
    analysis.value = response.analysis;
    if (response.toolTraces.length > 0) {
      toolTraces.value = [...toolTraces.value, ...response.toolTraces];
    }
    if (response.referenceSources.length > 0) {
      const merged = [...referenceSources.value, ...response.referenceSources];
      const seen = new Set<string>();
      referenceSources.value = merged.filter((src) => {
        const key = `${src.title}::${src.officialUrl}::${src.updatedAt}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
  } catch (err) {
    if (err instanceof ApiClientError && err.code === 'REQUEST_ABORTED') {
      return;
    }
    const detail =
      err instanceof ApiClientError
        ? err.requestId
          ? `${err.message}（Request ID: ${err.requestId}）`
          : err.message
        : '呼叫 AI Agent 失敗，請稍後再試';
    errorMessage.value = detail;
    promptInput.value = trimmed;
  } finally {
    if (activeController === controller) {
      isAnalyzing.value = false;
      activeController = null;
    }
  }
}

onBeforeUnmount(() => {
  activeController?.abort();
});
</script>

<template>
  <div class="grid grid-cols-[248px_minmax(0,1fr)_296px] gap-4 items-start">
    <!-- Left Column: Work Scenarios & Case Selection -->
    <section
      class="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3"
      aria-label="作業情境與案例選擇"
    >
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-[#1E293B] flex items-center gap-1.5">
          <Wrench class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>預設作業情境</span>
        </h2>
        <span class="text-[11px] text-[#64748B]">5 項測試範本</span>
      </div>

      <p class="text-[11px] text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded px-2.5 py-2 leading-relaxed">
        點擊下方情境可將假設性作業描述填入輸入框。所有情境僅作為測試輸入，不得宣稱為真實職災案例。
      </p>

      <div class="space-y-2" role="list">
        <button
          v-for="(scenario, index) in scenarioPresets"
          :key="scenario.id"
          type="button"
          class="w-full text-left rounded-md border p-3 transition-colors cursor-pointer"
          :class="
            selectedScenarioId === scenario.id
              ? 'border-[#0F766E] bg-teal-50/60'
              : 'border-[#E2E8F0] bg-white hover:border-slate-300 hover:bg-slate-50/70'
          "
          :data-testid="`scenario-btn-${scenario.id}`"
          @click="handleSelectScenario(scenario)"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold text-[#1E293B]">
              {{ index + 1 }}. {{ scenario.title }}
            </span>
          </div>
          <div class="text-[11px] text-[#0F766E] font-medium mt-1">{{ scenario.category }}</div>
          <p class="text-[11px] text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
            {{ scenario.description }}
          </p>
        </button>
      </div>
    </section>

    <!-- Center Column: Agent Workspace & Analysis Result -->
    <section
      class="bg-white border border-[#E2E8F0] rounded-lg flex flex-col min-w-0"
      aria-label="Agent 分析工作台"
    >
      <!-- Workspace Toolbar -->
      <div class="px-5 py-3.5 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="h-8 w-8 rounded-md bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F766E] shrink-0">
            <Bot class="h-4 w-4" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-sm font-semibold text-[#1E293B] whitespace-nowrap">SafeAgent 職安分析工作台</h2>
              <StatusBadge
                :label="systemStore.agentStatusLabel"
                :tone="isAgentEnabled ? 'success' : 'neutral'"
              />
            </div>
            <p class="text-[11px] text-[#64748B]">
              Single Agent Architecture（OpenAI Responses API + Tool Calling）
            </p>
          </div>
        </div>

        <!-- Mode Indicators -->
        <div class="flex items-center gap-2 shrink-0">
          <div
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium"
            :class="
              isAgentEnabled
                ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                : 'border-[#E2E8F0] bg-slate-50 text-[#64748B]'
            "
          >
            <Play class="h-3 w-3" aria-hidden="true" />
            <span>Live Agent Mode</span>
            <span
              class="text-[10px] px-1 rounded"
              :class="isAgentEnabled ? 'bg-[#0F766E] text-white' : 'bg-slate-200 text-slate-600'"
            >
              {{ isAgentEnabled ? '可用' : '未啟用' }}
            </span>
          </div>

          <button
            type="button"
            disabled
            title="Demo Mode 尚未啟用"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E2E8F0] bg-slate-50 text-xs font-medium text-[#64748B] cursor-not-allowed"
          >
            <span>Demo Mode</span>
            <span class="text-[10px] px-1 rounded bg-slate-200 text-slate-600">
              {{ isDemoEnabled ? '可用' : '未啟用' }}
            </span>
          </button>
        </div>
      </div>

      <!-- Conversation Area -->
      <div class="p-5 space-y-4 border-b border-[#E2E8F0] bg-[#F8FAFC]/60 min-h-[200px] max-h-[380px] overflow-y-auto">
        <div class="bg-white border border-[#E2E8F0] rounded-lg p-4 flex items-start gap-3">
          <div class="h-7 w-7 rounded bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
            <Info class="h-4 w-4" aria-hidden="true" />
          </div>
          <div class="space-y-1.5">
            <div class="text-xs font-semibold text-[#1E293B]">工作台說明</div>
            <p class="text-sm text-[#334155] leading-relaxed">
              請描述欲分析的作業情境，例如廠區設備維修、高處作業或化學品輸送作業。
            </p>
            <p
              v-if="!isAgentEnabled"
              class="text-xs text-[#D97706] flex items-center gap-1.5 pt-1"
            >
              <AlertCircle class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Live Agent 尚未啟用，請於後端 `.dev.vars` 設定 OPENAI_API_KEY 與 AGENT_ENABLED=true。</span>
            </p>
          </div>
        </div>

        <div
          v-if="messages.length === 0"
          class="text-xs text-[#64748B] text-center py-4 border border-dashed border-[#CBD5E1] rounded-md bg-white"
        >
          {{
            isAgentEnabled
              ? '尚未開始分析對話，請選擇左側預設情境或於下方輸入作業描述。'
              : '目前尚無對話紀錄（Live Agent 未啟用，不會產生模擬回覆）。'
          }}
        </div>

        <div v-else class="space-y-3" data-testid="workspace-messages">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="rounded-lg p-4 text-sm leading-relaxed border"
            :class="
              msg.role === 'user'
                ? 'bg-slate-800 text-white border-slate-800 ml-10'
                : 'bg-white text-[#1E293B] border-[#E2E8F0] mr-6'
            "
          >
            <div class="flex items-center justify-between gap-2 mb-1.5 text-[11px]">
              <span class="font-semibold" :class="msg.role === 'user' ? 'text-teal-200' : 'text-[#0F766E]'">
                {{ msg.role === 'user' ? '作業情境輸入' : 'SafeAgent 分析回覆' }}
              </span>
              <span v-if="msg.model" class="font-mono text-[#64748B]">{{ msg.model }}</span>
            </div>
            <p class="whitespace-pre-wrap">{{ msg.content }}</p>
          </div>
        </div>

        <div
          v-if="isAnalyzing"
          data-testid="workspace-loading"
          class="bg-white border border-teal-200 rounded-lg p-3.5 flex items-center gap-2.5 text-xs text-[#0F766E]"
        >
          <Loader2 class="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
          <span>正在透過 OpenAI Responses API 檢索職安知識庫、公開案例並辨識潛在危害...</span>
        </div>

        <div
          v-if="errorMessage"
          data-testid="workspace-error"
          class="bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-[#DC2626]"
        >
          <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{{ errorMessage }}</span>
        </div>
      </div>

      <!-- Input Area -->
      <form class="p-5 space-y-3 border-b border-[#E2E8F0]" @submit.prevent="handleSubmitAnalysis">
        <label for="workspace-scenario-input" class="block text-xs font-semibold text-[#1E293B]">
          作業情境描述輸入
        </label>
        <textarea
          id="workspace-scenario-input"
          ref="textareaRef"
          v-model="promptInput"
          rows="4"
          data-testid="workspace-input"
          class="w-full rounded-md border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none resize-y"
          placeholder="請描述欲分析的作業情境，例如廠區設備維修、高處作業或化學品輸送作業。"
        />

        <div class="flex items-center justify-between gap-4">
          <p class="text-xs text-[#64748B]">
            {{
              isAgentEnabled
                ? conversationId
                  ? '多輪對話已連結（可直接補充現場條件繼續分析）'
                  : '送出後將由 Single Agent 自主呼叫知識庫工具進行初篩'
                : 'Live Agent 尚未啟用，將於後端設定完成後開放。'
            }}
          </p>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="clear-workspace-btn"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E2E8F0] bg-white text-xs font-medium text-[#475569] hover:bg-slate-50 transition-colors cursor-pointer"
              @click="handleClearConversation"
            >
              <Eraser class="h-3.5 w-3.5" aria-hidden="true" />
              <span>清除對話</span>
            </button>

            <button
              type="submit"
              :disabled="!canSubmit"
              data-testid="submit-workspace-btn"
              :title="isAgentEnabled ? '送出至 Live Agent 分析' : 'Live Agent 尚未啟用'"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-medium transition-colors"
              :class="
                canSubmit
                  ? 'bg-[#0F766E] text-white hover:bg-[#0D655E] cursor-pointer'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              "
            >
              <Send class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ isAnalyzing ? '分析中...' : '送出分析' }}</span>
            </button>
          </div>
        </div>
      </form>

      <!-- Structured Output Panels -->
      <div class="p-5 grid grid-cols-2 gap-4 bg-[#F8FAFC]/40 items-start">
        <!-- Clarification Questions Panel -->
        <div
          class="bg-white border border-[#E2E8F0] rounded-md p-4 space-y-2.5"
          data-testid="clarification-panel"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 whitespace-nowrap">
              <HelpCircle class="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
              <span>補充資訊提問區</span>
            </h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B] shrink-0 whitespace-nowrap">
              {{ analysis ? `${analysis.clarificationQuestions.length} 項` : '待分析' }}
            </span>
          </div>
          <p class="text-xs text-[#64748B] leading-relaxed">
            當現場環境參數、能量隔離狀態或防護具資訊不足時，Agent 將於此處列出待確認問題（點擊可填入回覆）。
          </p>

          <ul v-if="analysis && analysis.clarificationQuestions.length > 0" class="space-y-2">
            <li v-for="(question, idx) in analysis.clarificationQuestions" :key="idx">
              <button
                type="button"
                class="w-full text-left text-xs text-[#1E293B] bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 rounded px-3 py-2 transition-colors cursor-pointer"
                @click="handleUseClarificationQuestion(question)"
              >
                {{ idx + 1 }}. {{ question }}
              </button>
            </li>
          </ul>
          <div
            v-else
            class="text-[11px] text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded p-3 text-center"
          >
            {{ analysis ? '目前已無額外待補充問題' : '尚無待補充資訊項目' }}
          </div>
        </div>

        <!-- Preliminary Assessment Report Panel -->
        <div
          class="bg-white border border-[#E2E8F0] rounded-md p-4 space-y-3"
          data-testid="analysis-report-panel"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 whitespace-nowrap">
              <FileText class="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
              <span>危害辨識與初步分析區</span>
            </h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B] shrink-0 whitespace-nowrap">
              {{ analysis ? `${analysis.identifiedHazards.length} 類危害` : 'Day 4 加入風險矩陣' }}
            </span>
          </div>

          <div v-if="analysis" class="space-y-3 text-xs">
            <div class="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2.5 text-[#334155]">
              {{ analysis.scenarioSummary }}
            </div>

            <div v-if="analysis.identifiedHazards.length > 0" class="space-y-2">
              <div
                v-for="(hazard, idx) in analysis.identifiedHazards"
                :key="idx"
                class="border border-[#E2E8F0] rounded p-3 space-y-1.5"
              >
                <div class="font-semibold text-[#1E293B] flex items-center gap-1.5">
                  <ShieldAlert class="h-3.5 w-3.5 text-[#D97706] shrink-0" aria-hidden="true" />
                  <span>{{ hazard.hazardType }}</span>
                </div>
                <p class="text-[#475569] leading-relaxed">{{ hazard.description }}</p>
                <p class="text-[11px] text-[#DC2626]">可能後果：{{ hazard.potentialConsequence }}</p>
                <ul v-if="hazard.recommendedControls.length > 0" class="text-[11px] text-[#334155] space-y-0.5 pt-1">
                  <li v-for="ctrl in hazard.recommendedControls" :key="ctrl">· {{ ctrl }}</li>
                </ul>
                <div v-if="hazard.relatedRegulations.length > 0" class="text-[11px] text-[#0F766E] pt-0.5">
                  依據：{{ hazard.relatedRegulations.join('、') }}
                </div>
              </div>
            </div>

            <div v-if="analysis.recommendedActions.length > 0" class="space-y-1">
              <div class="font-semibold text-[#1E293B]">建議優先行動</div>
              <ul class="text-[11px] text-[#334155] space-y-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded p-2.5">
                <li v-for="act in analysis.recommendedActions" :key="act">· {{ act }}</li>
              </ul>
            </div>

            <p class="text-[11px] text-[#64748B] border-t border-[#E2E8F0] pt-2 leading-relaxed">
              {{ analysis.limitationsNotice }}
            </p>
          </div>

          <template v-else>
            <p class="text-xs text-[#64748B] leading-relaxed">
              將呈現危害辨識清單、控制措施建議及依據法規（風險分數計算將於 Day 4 整合官方矩陣規則後開放）。
            </p>
            <div class="text-[11px] text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded p-3 text-center">
              尚未產生危害辨識與初步分析結果
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Right Column: Agent Execution Trace & References -->
    <aside class="space-y-4" aria-label="工具執行紀錄與參考資料">
      <!-- Agent Execution Trace -->
      <section class="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3" data-testid="execution-trace-panel">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[#1E293B] flex items-center gap-1.5">
            <Terminal class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>Agent Execution Trace</span>
          </h2>
          <span class="text-[11px] text-[#64748B]">
            {{ toolTraces.length > 0 ? `${toolTraces.length} 筆紀錄` : 'Empty State' }}
          </span>
        </div>

        <p class="text-[11px] text-[#64748B] leading-relaxed">
          僅顯示真實工具執行紀錄與可公開摘要，不顯示模型內部推理過程。
        </p>

        <ul v-if="toolTraces.length > 0" class="space-y-2" data-testid="trace-list">
          <li
            v-for="trace in toolTraces"
            :key="trace.id"
            class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1.5 text-[11px]"
          >
            <div class="flex items-center justify-between gap-2">
              <code class="font-mono font-semibold text-[#0F766E]">{{ trace.toolName }}</code>
              <span class="inline-flex items-center gap-1 text-[#16A34A] font-medium">
                <CheckCircle2 class="h-3 w-3" aria-hidden="true" />
                <span>{{ trace.executionStatus }}</span>
              </span>
            </div>
            <div class="text-[#475569]">輸入：{{ trace.inputSummary }}</div>
            <div class="text-[#1E293B]">結果：{{ trace.outputSummary }}</div>
            <div class="flex items-center gap-1 text-[#64748B]">
              <Clock class="h-3 w-3" aria-hidden="true" />
              <span>耗時：{{ trace.executionDurationMs ?? 0 }} ms</span>
            </div>
          </li>
        </ul>

        <div v-else class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-3 text-center">
          <div class="text-xs font-medium text-[#475569]">尚無工具執行紀錄</div>
          <div class="text-[11px] text-[#64748B] mt-1">送出分析後將呈現實際呼叫之知識與危害工具摘要</div>
        </div>

        <div class="space-y-1.5 pt-1">
          <div class="text-[11px] font-semibold text-[#475569]">工具註冊清單</div>
          <ul class="space-y-1">
            <li
              v-for="tool in reservedTools"
              :key="tool.name"
              class="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]"
            >
              <code class="font-mono" :class="tool.enabledInDay3 ? 'text-[#0F766E]' : 'text-[#94A3B8]'">
                {{ tool.name }}
              </code>
              <span class="text-[#64748B]">{{ tool.label }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Reference Sources -->
      <section class="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3" data-testid="reference-sources-panel">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[#1E293B] flex items-center gap-1.5">
            <BookMarked class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>參考資料區</span>
          </h2>
          <span class="text-[11px] text-[#64748B]">
            {{ referenceSources.length > 0 ? `${referenceSources.length} 筆來源` : '可追溯來源' }}
          </span>
        </div>

        <ul v-if="referenceSources.length > 0" class="space-y-2" data-testid="reference-source-list">
          <li
            v-for="(src, idx) in referenceSources"
            :key="`${src.title}-${idx}`"
            class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3 space-y-1 text-[11px]"
          >
            <div class="font-semibold text-[#1E293B]">{{ src.title }}</div>
            <div class="text-[#64748B]">發布機關：{{ src.publisher }}（{{ src.updatedAt }}）</div>
            <p class="text-[#475569] leading-relaxed">{{ src.citationSummary }}</p>
            <a
              :href="src.officialUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-[#0F766E] font-medium hover:underline pt-0.5"
            >
              <span>查閱官方來源</span>
              <ExternalLink class="h-3 w-3" aria-hidden="true" />
            </a>
          </li>
        </ul>

        <div
          v-else
          class="border border-dashed border-[#CBD5E1] rounded-md p-3 text-center text-[11px] text-[#64748B]"
        >
          目前尚無引用來源紀錄
        </div>
      </section>
    </aside>
  </div>
</template>
