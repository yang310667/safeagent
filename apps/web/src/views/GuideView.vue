<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  FlaskConical,
  Grid2x2,
  HelpCircle,
  MessageSquarePlus,
  ShieldAlert,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { useRiskStore } from '@/stores/risk';

const router = useRouter();
const riskStore = useRiskStore();

const quickSteps = [
  {
    step: 'Step 1',
    title: '輸入或點選作業情境',
    desc: '前往「AI 風險評估」點選左側 5 項預設情境，或直接描述現場設備、高度、能源與化學品條件。',
  },
  {
    step: 'Step 2',
    title: '觀察即時工具檢索與引用',
    desc: 'Agent 會透過 SSE 即時呼叫知識庫、職災案例與危害目錄工具，並於右側顯示耗時與官方連結。',
  },
  {
    step: 'Step 3',
    title: '點擊補充問題進行多輪確認',
    desc: '若情境資訊不足，可點擊「補充資訊提問區」問題快速補充高度、LOTO 上鎖或 SDS 等條件繼續分析。',
  },
  {
    step: 'Step 4',
    title: '人工確認 5×5 風險矩陣與匯出報告',
    desc: '點「帶入 5×5 風險矩陣評估」，由人工確認現場條件與 P×S 分數後繪製 ECharts 圖表並下載 Markdown 報告。',
  },
];

const usageExamples = [
  {
    id: 'guide-ex-1',
    title: '範例 1｜廠區頂樓排氣風車維修（含多輪追問示範）',
    tag: '高處作業 ＋ 機械捲夾 ＋ LOTO',
    firstTurn:
      '預計於廠區頂樓進行空氣污染防制設備排氣風車軸承與皮帶更換作業，作業高度鄰近屋頂女兒牆，現場風速較高且設備需斷電隔離。',
    followUpTurn:
      '補充說明：頂樓女兒牆高度約 60 公分，作業人員立足點距地面約 12 公尺，總電源已執行上鎖掛牌並檢電確認無電，目前風速不大且無承攬商共同作業。',
    expectedHighlight:
      'Agent 會先呼叫知識庫與職災案例工具，點出 2 公尺以上高處墜落與皮帶輪捲夾風險，並追問女兒牆高度與上鎖狀態；補充後即調整為聚焦女兒牆防護不足與 12 公尺高架作業防護。',
  },
  {
    id: 'guide-ex-2',
    title: '範例 2｜酸性清洗劑輸送管線法蘭墊片拆換',
    tag: '化學品危害 ＋ 管線隔離',
    firstTurn:
      '預計拆換酸性清洗劑輸送管線法蘭墊片，管線連接儲槽與製程端，作業前需確認管內殘餘液體排空與個人防護具配置。',
    followUpTurn:
      '補充說明：已取得該酸性清洗劑 SDS，管線入口閥門已關閉並加裝盲封，但管線低點殘液尚未完全洩壓排空，現場已備妥洗眼淋浴設備與耐酸鹼防護衣。',
    expectedHighlight:
      'Agent 會檢索《危害性化學品標示及通識規則》與職安署化學品灌注誤接案例，提醒切勿混用不相容藥劑，並確認洩壓排空、盲封上鎖及呼吸／皮膚防護等級。',
  },
  {
    id: 'guide-ex-3',
    title: '範例 3｜低壓配電盤紅外線測溫與端子緊固',
    tag: '電氣安全 ＋ 感電防護',
    firstTurn:
      '預計對廠房低壓配電盤進行紅外線測溫巡檢與接線端子緊固作業，部分鄰近匯流排可能處於帶電狀態。',
    followUpTurn:
      '補充說明：紅外線測溫為非接觸式巡檢，端子緊固作業預計於停電後執行，已備有檢電器、絕緣手套及漏電斷路器保護。',
    expectedHighlight:
      'Agent 會區分帶電測溫與停電緊固作業階段，引用職安署感電案例與《職業安全衛生設施規則》，強調非活線作業必須斷電、檢電、上鎖並做好絕緣隔離。',
  },
];

const moduleDirectory = [
  { name: 'AI 風險評估（Workspace）', path: '/workspace', desc: 'Single Agent SSE 串流分析、多輪補充提問與工具追蹤' },
  { name: '5×5 風險矩陣', path: '/risk-matrix', desc: '人工確認現場條件後計算改善前／剩餘風險，搭配 ECharts 視覺化與報告匯出' },
  { name: '職安知識庫', path: '/knowledge', desc: '查詢全國法規資料庫與職安署官方指引、危害控制階層' },
  { name: '職災案例', path: '/accident-cases', desc: '檢索職安署公開職災案例之經過、三層原因與預防對策' },
  { name: 'Agent 評估與測試', path: '/evaluation', desc: '檢視 5 題基準測試集於六大指標之實際量化通過率與即時重測' },
  { name: '自主學習紀錄 / 未來研究方向', path: '/future-research', desc: '呈現 2026/12 職安管理員課程規劃與無人機熱像巡檢研究構想' },
];

function tryExampleInWorkspace(prompt: string): void {
  riskStore.setWorkspacePromptDraft(prompt);
  void router.push('/workspace');
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">使用說明與操作範例（User Guide）</h2>
          <StatusBadge label="快速導覽・一鍵帶入測試" tone="success" />
        </div>
        <p class="text-sm text-[#64748B]">
          提供 SafeAgent 完整操作流程與實測作業情境範例，協助審查委員與學習者快速體驗多輪危害辨識、來源追溯與 5×5 風險矩陣評估。
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] transition-colors shrink-0 cursor-pointer"
        @click="router.push('/workspace')"
      >
        <Bot class="h-4 w-4" aria-hidden="true" />
        <span>前往 AI 風險評估</span>
      </button>
    </section>

    <!-- 4-Step Flow -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
        <HelpCircle class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
        <span>4 步驟操作流程</span>
      </h3>
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="item in quickSteps"
          :key="item.step"
          class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2"
        >
          <span class="inline-block text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200">
            {{ item.step }}
          </span>
          <div class="text-sm font-semibold text-[#1E293B]">{{ item.title }}</div>
          <p class="text-xs text-[#475569] leading-relaxed">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Interactive Examples -->
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <MessageSquarePlus class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>操作範例庫（點擊可直接帶入 AI 工作台）</span>
        </h3>
        <span class="text-xs text-[#64748B]">均為教學與測試用途情境</span>
      </div>

      <div class="space-y-4" data-testid="guide-examples-list">
        <article
          v-for="ex in usageExamples"
          :key="ex.id"
          class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4"
        >
          <div class="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-3">
            <div class="space-y-1">
              <h4 class="text-sm font-semibold text-[#1E293B]">{{ ex.title }}</h4>
              <span class="inline-block text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
                {{ ex.tag }}
              </span>
            </div>
            <button
              type="button"
              :data-testid="`try-example-${ex.id}`"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F766E] text-white text-xs font-medium hover:bg-[#0D655E] transition-colors shrink-0 cursor-pointer"
              @click="tryExampleInWorkspace(ex.firstTurn)"
            >
              <span>帶入工作台試用</span>
              <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4 text-xs">
            <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1.5">
              <div class="font-semibold text-[#0F766E]">第 1 輪輸入範例（初始情境）</div>
              <p class="text-[#334155] leading-relaxed">{{ ex.firstTurn }}</p>
            </div>
            <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1.5">
              <div class="font-semibold text-[#1E293B]">第 2 輪回覆範例（補充現場條件）</div>
              <p class="text-[#334155] leading-relaxed">{{ ex.followUpTurn }}</p>
            </div>
          </div>

          <div class="flex items-start gap-2 text-xs text-[#475569] bg-teal-50/50 border border-teal-200/70 rounded px-3.5 py-2.5">
            <CheckCircle2 class="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
            <span><strong>預期分析重點：</strong>{{ ex.expectedHighlight }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- Module Directory & Safety Reminder -->
    <div class="grid grid-cols-12 gap-6 items-start">
      <section class="col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
        <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
          <BookOpen class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>平台功能分頁導覽</span>
        </h3>
        <div class="divide-y divide-[#F1F5F9]">
          <div
            v-for="mod in moduleDirectory"
            :key="mod.path"
            class="py-2.5 flex items-center justify-between gap-4 text-xs"
          >
            <div>
              <div class="font-semibold text-[#1E293B]">{{ mod.name }}</div>
              <div class="text-[#64748B] mt-0.5">{{ mod.desc }}</div>
            </div>
            <button
              type="button"
              class="px-2.5 py-1 rounded border border-[#E2E8F0] text-[#0F766E] hover:bg-teal-50 shrink-0 cursor-pointer"
              @click="router.push(mod.path)"
            >
              前往
            </button>
          </div>
        </div>
      </section>

      <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
        <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
          <ShieldAlert class="h-4 w-4 text-[#D97706]" aria-hidden="true" />
          <span>安全使用與研究邊界提醒</span>
        </h3>
        <ul class="space-y-2 text-xs text-[#475569] leading-relaxed">
          <li class="flex items-start gap-2">
            <AlertTriangle class="h-3.5 w-3.5 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
            <span>本系統為研究概念驗證（PoC），不構成正式作業許可或法定風險評估文件。</span>
          </li>
          <li class="flex items-start gap-2">
            <Grid2x2 class="h-3.5 w-3.5 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
            <span>5×5 風險矩陣分數必須由使用者確認現場作業條件後由確定性規則計算，禁止由 LLM 擅自給分。</span>
          </li>
          <li class="flex items-start gap-2">
            <FlaskConical class="h-3.5 w-3.5 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
            <span>所有法規與案例引用皆受右側「參考資料區」官方來源約束，可隨時點擊原始連結查核。</span>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
