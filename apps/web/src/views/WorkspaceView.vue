<script setup lang="ts">
import { computed, ref } from 'vue';
import type { AgentToolName, ScenarioPreset } from '@safeagent/shared';
import {
  AlertCircle,
  BookMarked,
  Bot,
  Eraser,
  FileText,
  HelpCircle,
  Info,
  Play,
  Send,
  Terminal,
  Wrench,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { useSystemStore } from '@/stores/system';

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

const reservedTools: Array<{ name: AgentToolName; label: string }> = [
  { name: 'search_safety_knowledge', label: '職安知識庫檢索' },
  { name: 'search_accident_cases', label: '職災案例檢索' },
  { name: 'identify_hazards', label: '危害辨識輔助' },
  { name: 'calculate_risk', label: '風險等級計算' },
  { name: 'generate_report', label: '初步報告產出' },
];

const selectedScenarioId = ref<string | null>(null);
const promptInput = ref('');

const isAgentEnabled = computed(() => Boolean(systemStore.config?.agentEnabled));
const isDemoEnabled = computed(() => Boolean(systemStore.config?.demoEnabled));

function handleSelectScenario(scenario: ScenarioPreset) {
  selectedScenarioId.value = scenario.id;
  promptInput.value = scenario.description;
}

function handleClearConversation() {
  selectedScenarioId.value = null;
  promptInput.value = '';
}
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
              <StatusBadge :label="systemStore.agentStatusLabel" tone="neutral" />
            </div>
            <p class="text-[11px] text-[#64748B]">Single Agent Architecture（Day 1 介面骨架）</p>
          </div>
        </div>

        <!-- Mode Indicators -->
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled
            title="Live Agent Mode 將於後續開發階段開放"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#E2E8F0] bg-slate-50 text-xs font-medium text-[#64748B] cursor-not-allowed"
          >
            <Play class="h-3 w-3" aria-hidden="true" />
            <span>Live Agent Mode</span>
            <span class="text-[10px] px-1 rounded bg-slate-200 text-slate-600">
              {{ isAgentEnabled ? '可用' : '未啟用' }}
            </span>
          </button>

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
      <div class="p-5 space-y-4 border-b border-[#E2E8F0] bg-[#F8FAFC]/60 min-h-[200px]">
        <div class="bg-white border border-[#E2E8F0] rounded-lg p-4 flex items-start gap-3">
          <div class="h-7 w-7 rounded bg-teal-50 text-[#0F766E] flex items-center justify-center shrink-0 mt-0.5">
            <Info class="h-4 w-4" aria-hidden="true" />
          </div>
          <div class="space-y-1.5">
            <div class="text-xs font-semibold text-[#1E293B]">工作台說明</div>
            <p class="text-sm text-[#334155] leading-relaxed">
              請描述欲分析的作業情境，例如廠區設備維修、高處作業或化學品輸送作業。
            </p>
            <p class="text-xs text-[#D97706] flex items-center gap-1.5 pt-1">
              <AlertCircle class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Live Agent 尚未啟用，將於後續開發階段開放。</span>
            </p>
          </div>
        </div>

        <div class="text-xs text-[#64748B] text-center py-4 border border-dashed border-[#CBD5E1] rounded-md bg-white">
          目前尚無對話紀錄（Day 1 未串接 OpenAI API，不會產生模擬回覆）。
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-5 space-y-3 border-b border-[#E2E8F0]">
        <label for="workspace-scenario-input" class="block text-xs font-semibold text-[#1E293B]">
          作業情境描述輸入
        </label>
        <textarea
          id="workspace-scenario-input"
          v-model="promptInput"
          rows="4"
          data-testid="workspace-input"
          class="w-full rounded-md border border-[#CBD5E1] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none resize-y"
          placeholder="請描述欲分析的作業情境，例如廠區設備維修、高處作業或化學品輸送作業。"
        />

        <div class="flex items-center justify-between gap-4">
          <p class="text-xs text-[#64748B]">
            Live Agent 尚未啟用，將於後續開發階段開放。
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
              type="button"
              disabled
              data-testid="submit-workspace-btn"
              title="Live Agent 尚未啟用，將於後續開發階段開放。"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-200 text-slate-500 text-xs font-medium cursor-not-allowed"
            >
              <Send class="h-3.5 w-3.5" aria-hidden="true" />
              <span>送出分析</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Structured Output Panels Skeleton -->
      <div class="p-5 grid grid-cols-2 gap-4 bg-[#F8FAFC]/40">
        <!-- Clarification Questions Panel -->
        <div class="bg-white border border-[#E2E8F0] rounded-md p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 whitespace-nowrap">
              <HelpCircle class="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
              <span>補充資訊提問區</span>
            </h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B] shrink-0 whitespace-nowrap">預留介面</span>
          </div>
          <p class="text-xs text-[#64748B] leading-relaxed">
            當現場環境參數、能量隔離狀態或防護具資訊不足時，Agent 將於此處列出待確認問題。
          </p>
          <div class="text-[11px] text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded p-3 text-center">
            尚無待補充資訊項目
          </div>
        </div>

        <!-- Preliminary Assessment Report Panel -->
        <div class="bg-white border border-[#E2E8F0] rounded-md p-4 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5 whitespace-nowrap">
              <FileText class="h-3.5 w-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
              <span>分析報告區</span>
            </h3>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-[#64748B] shrink-0 whitespace-nowrap">預留介面</span>
          </div>
          <p class="text-xs text-[#64748B] leading-relaxed">
            未來將呈現危害辨識清單、控制措施建議及初步風險等級摘要（僅供研究輔助參考）。
          </p>
          <div class="text-[11px] text-[#94A3B8] border border-dashed border-[#E2E8F0] rounded p-3 text-center">
            尚未產生初步風險評估報告
          </div>
        </div>
      </div>
    </section>

    <!-- Right Column: Agent Execution Trace & References -->
    <aside class="space-y-4" aria-label="工具執行紀錄與參考資料">
      <!-- Agent Execution Trace -->
      <section class="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[#1E293B] flex items-center gap-1.5">
            <Terminal class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>Agent Execution Trace</span>
          </h2>
          <span class="text-[11px] text-[#64748B]">Empty State</span>
        </div>

        <p class="text-[11px] text-[#64748B] leading-relaxed">
          未來僅顯示真實工具執行紀錄與可公開摘要（Tool Name、Execution Status、Execution Duration、Input / Output Summary、Reference Sources），不顯示模型內部推理過程。
        </p>

        <div class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-3 text-center">
          <div class="text-xs font-medium text-[#475569]">尚無工具執行紀錄</div>
          <div class="text-[11px] text-[#64748B] mt-1">將於 Day 3 / Day 5 串接真實 Tool Calling</div>
        </div>

        <div class="space-y-1.5 pt-1">
          <div class="text-[11px] font-semibold text-[#475569]">預留工具清單（Reserved Tools）</div>
          <ul class="space-y-1">
            <li
              v-for="tool in reservedTools"
              :key="tool.name"
              class="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0]"
            >
              <code class="font-mono text-[#0F766E]">{{ tool.name }}</code>
              <span class="text-[#64748B]">{{ tool.label }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Reference Sources -->
      <section class="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-[#1E293B] flex items-center gap-1.5">
            <BookMarked class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>參考資料區</span>
          </h2>
          <span class="text-[11px] text-[#64748B]">可追溯來源</span>
        </div>

        <p class="text-[11px] text-[#64748B] leading-relaxed">
          Day 1 不填入未經查證之法規條文。未來引用資料將包含以下欄位：
        </p>

        <ul class="text-[11px] text-[#475569] space-y-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded p-3">
          <li>· 資料標題</li>
          <li>· 發布機關</li>
          <li>· 官方來源網址</li>
          <li>· 更新日期</li>
          <li>· 引用摘要</li>
        </ul>

        <div class="border border-dashed border-[#CBD5E1] rounded-md p-3 text-center text-[11px] text-[#64748B]">
          目前尚無引用來源紀錄
        </div>
      </section>
    </aside>
  </div>
</template>
