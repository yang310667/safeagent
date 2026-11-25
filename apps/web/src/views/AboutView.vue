<script setup lang="ts">
import {
  AlertTriangle,
  Cpu,
  Database,
  ExternalLink,
  Github,
  Info,
  Layers,
  ShieldAlert,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { useSystemStore } from '@/stores/system';

const systemStore = useSystemStore();

const roadmapPhases = [
  { day: 'Day 1', title: '專案初始化與基礎架構', status: '已完成', tone: 'success' as const },
  { day: 'Day 2', title: '官方職安資料蒐集與知識庫', status: '待開發', tone: 'neutral' as const },
  { day: 'Day 3', title: 'OpenAI Live Agent 與 Function Calling', status: '待開發', tone: 'neutral' as const },
  { day: 'Day 4', title: '風險矩陣與結構化報告', status: '待開發', tone: 'neutral' as const },
  { day: 'Day 5', title: 'SSE Streaming 與 Agent Execution Trace', status: '待開發', tone: 'neutral' as const },
  { day: 'Day 6', title: 'Agent 測試與評估', status: '待開發', tone: 'neutral' as const },
  { day: 'Day 7', title: '正式部署與備審展示優化', status: '待開發', tone: 'neutral' as const },
];

const dataSources = [
  '勞動部職業安全衛生署',
  '勞動部勞動法令查詢系統',
  '全國法規資料庫',
  '政府資料開放平臺',
  '職業災害預防及重建中心',
];
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Background & Motivation -->
    <div class="grid grid-cols-12 gap-6">
      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
        <h2 class="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <Info class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>專案背景</span>
        </h2>
        <p class="text-sm text-[#475569] leading-relaxed">
          SafeAgent（AI 產業安全與風險評估助手）為個人開源研究概念驗證（PoC）專案，定位作為陽明交通大學產業安全與防災碩士在職專班之跨領域備審作品，展示資訊系統工程、AI Agent 工具呼叫架構與職業安全衛生知識之整合實作。
        </p>
      </section>

      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
        <h2 class="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <Layers class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>開發動機</span>
        </h2>
        <p class="text-sm text-[#475569] leading-relaxed">
          本專案源於資訊技術與產業安全的跨領域學習構想，希望透過 AI Agent、知識檢索及風險評估方法，探索人工智慧在危害辨識、設備安全及產業防災上的應用可行性。
        </p>
      </section>
    </div>

    <!-- Tech Stack & Roadmap -->
    <div class="grid grid-cols-12 gap-6">
      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <h2 class="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <Cpu class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>技術架構</span>
        </h2>
        <dl class="space-y-2.5 text-xs">
          <div class="flex justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-[#64748B]">Frontend</dt>
            <dd class="font-medium text-[#1E293B]">Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind CSS</dd>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-[#64748B]">Backend</dt>
            <dd class="font-medium text-[#1E293B]">Cloudflare Workers, TypeScript, Hono, Wrangler</dd>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-[#64748B]">AI Agent（後續階段）</dt>
            <dd class="font-medium text-[#1E293B]">OpenAI Responses API, Single Agent + Function Calling</dd>
          </div>
          <div class="flex justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-[#64748B]">Knowledge Base</dt>
            <dd class="font-medium text-[#1E293B]">JSON &amp; Markdown（暫不使用關聯式或向量資料庫）</dd>
          </div>
          <div class="flex justify-between py-1.5">
            <dt class="text-[#64748B]">Deployment &amp; CI/CD</dt>
            <dd class="font-medium text-[#1E293B]">GitHub Pages + Cloudflare Workers + GitHub Actions</dd>
          </div>
        </dl>
      </section>

      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <h2 class="text-base font-semibold text-[#1E293B]">開發進度（7-Day Roadmap）</h2>
        <ul class="space-y-2">
          <li
            v-for="phase in roadmapPhases"
            :key="phase.day"
            class="flex items-center justify-between text-xs py-1.5 border-b border-[#F1F5F9] last:border-b-0"
          >
            <div>
              <span class="font-mono font-semibold text-[#0F766E] mr-2">{{ phase.day }}</span>
              <span class="text-[#1E293B]">{{ phase.title }}</span>
            </div>
            <StatusBadge :label="phase.status" :tone="phase.tone" :show-dot="false" />
          </li>
        </ul>
      </section>
    </div>

    <!-- Data Sources & Limitations -->
    <div class="grid grid-cols-12 gap-6">
      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
        <h2 class="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <Database class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>預計資料來源（待查證清單）</span>
        </h2>
        <ul class="space-y-1.5 text-xs text-[#475569]">
          <li v-for="source in dataSources" :key="source">· {{ source }}</li>
        </ul>
        <p class="text-[11px] text-[#64748B] pt-1">
          所有正式知識資料將於 Day 2 查證官方原始發布資訊後建檔，並標註來源 URL 與更新日期。
        </p>
      </section>

      <section class="col-span-6 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
        <h2 class="text-base font-semibold text-[#1E293B] flex items-center gap-2">
          <ShieldAlert class="h-4 w-4 text-[#D97706]" aria-hidden="true" />
          <span>研究限制與技術邊界</span>
        </h2>
        <ul class="space-y-1.5 text-xs text-[#475569] leading-relaxed">
          <li>· Day 1 尚未整合真實 OpenAI API 與職安知識庫資料，僅完成前後端架構與介面骨架。</li>
          <li>· AI 模型可能存在遺漏現場特殊條件或推論誤差，不得作為唯一決策依據。</li>
          <li>· 系統未包含正式作業許可簽核功能，亦未完成現場實證評估。</li>
        </ul>
      </section>
    </div>

    <!-- Disclaimer & GitHub Repository -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-start gap-3">
        <AlertTriangle class="h-5 w-5 text-[#DC2626] shrink-0 mt-0.5" aria-hidden="true" />
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-[#1E293B]">使用免責聲明</h2>
          <p class="text-xs text-[#475569] leading-relaxed">
            本系統為自主學習與研究概念驗證（PoC）用途，所呈現之危害辨識、知識檢索與風險評估介面均不得取代專業職業安全衛生人員之現場勘查與評估，亦不構成任何法定職業安全衛生評估報告或作業安全許可。
          </p>
        </div>
      </div>

      <div class="pt-4 border-t border-[#E2E8F0] flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-[#475569]">
          <Github class="h-4 w-4 text-[#1E293B]" aria-hidden="true" />
          <span>GitHub Repository：</span>
          <span v-if="!systemStore.githubRepositoryUrl" class="text-[#64748B]">
            尚未於環境變數（VITE_GITHUB_REPOSITORY_URL）設定
          </span>
        </div>

        <a
          v-if="systemStore.githubRepositoryUrl"
          :href="systemStore.githubRepositoryUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#0F766E] hover:bg-teal-50 transition-colors"
        >
          <span>前往 GitHub Repository</span>
          <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <button
          v-else
          type="button"
          disabled
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2E8F0] bg-slate-100 text-xs font-medium text-slate-400 cursor-not-allowed"
        >
          <span>尚未設定 Repository 網址</span>
        </button>
      </div>
    </section>
  </div>
</template>
