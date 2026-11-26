<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Compass,
  Cpu,
  Database,
  FileSearch,
  Grid2x2,
  Info,
  Layers,
  Radar,
  Server,
  ShieldAlert,
  Thermometer,
} from 'lucide-vue-next';
import AgentWorkflowDiagram from '@/components/AgentWorkflowDiagram.vue';
import StatusBadge, { type BadgeTone } from '@/components/StatusBadge.vue';
import { useSystemStore } from '@/stores/system';

const systemStore = useSystemStore();

const coreFeatures = [
  {
    title: 'AI 危害辨識',
    description: '根據作業情境，協助辨識潛在危害與可能後果。',
    status: '已啟用（Day 3 完成）',
    tone: 'success' as const,
    icon: ShieldAlert,
    to: '/workspace',
  },
  {
    title: '職安知識檢索',
    description: '檢索具有官方資料來源的職業安全衛生知識。',
    status: '已啟用（Day 2 完成）',
    tone: 'success' as const,
    icon: BookOpen,
    to: '/knowledge',
  },
  {
    title: '風險矩陣評估',
    description: '透過發生可能性與後果嚴重度，協助進行初步風險評估。',
    status: '規劃中（Day 4 實作）',
    tone: 'warning' as const,
    icon: Grid2x2,
    to: '/risk-matrix',
  },
  {
    title: '職災案例分析',
    description: '透過公開職災案例，了解事故原因及預防措施。',
    status: '已啟用（Day 2 完成）',
    tone: 'success' as const,
    icon: FileSearch,
    to: '/accident-cases',
  },
];

const futureTopics = [
  {
    title: '無人機熱像巡檢',
    desc: '探索結合無人機載具與紅外線熱像儀，應用於高處或大型廠區設備巡檢之研究構想。',
    icon: Radar,
  },
  {
    title: '工業設備異常溫升預警',
    desc: '研究透過熱影像與運轉歷史資料分析設備異常溫升趨勢，作為預防性維護輔助參考。',
    icon: Thermometer,
  },
  {
    title: '智慧工安與風險管理',
    desc: '結合數位化紀錄、作業情境脈絡與標準化風險評估流程，提升資料檢索效率。',
    icon: Layers,
  },
  {
    title: 'AI 輔助產業安全分析',
    desc: '評估單一 Agent 工具呼叫架構於職安知識問答與資料追溯上的可控性與限制。',
    icon: Cpu,
  },
];

const backendTone = computed<BadgeTone>(() => {
  if (systemStore.backendStatus === 'connected') return 'success';
  if (systemStore.backendStatus === 'checking') return 'warning';
  return 'danger';
});

const knowledgeBaseTone = computed<BadgeTone>(() =>
  systemStore.config?.knowledgeBaseEnabled ? 'success' : 'neutral',
);

const agentTone = computed<BadgeTone>(() =>
  systemStore.config?.agentEnabled ? 'success' : 'neutral',
);
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Hero Section -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-7">
      <div class="flex items-start justify-between gap-8">
        <div class="max-w-3xl space-y-4">
          <div class="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-teal-50 text-[#0F766E] border border-teal-200 text-xs font-medium">
            <span>研究概念驗證（Proof of Concept）</span>
            <span aria-hidden="true">·</span>
            <span>Day 3 Live Agent 工具呼叫階段</span>
          </div>

          <div>
            <h2 class="text-3xl font-bold tracking-tight text-[#1E293B]">SafeAgent</h2>
            <p class="text-lg font-medium text-[#0F766E] mt-1">AI 產業安全與風險評估助手</p>
          </div>

          <p class="text-sm text-[#475569] leading-relaxed">
            結合人工智慧、職業安全衛生知識與風險評估方法，探索資訊技術於產業安全領域的應用。
          </p>

          <div class="flex flex-wrap items-center gap-3 pt-1">
            <RouterLink
              to="/workspace"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[#0F766E] text-white text-sm font-medium hover:bg-[#0D655E] transition-colors"
            >
              <Bot class="h-4 w-4" aria-hidden="true" />
              <span>開始 AI 風險評估</span>
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
            </RouterLink>

            <RouterLink
              to="/knowledge"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[#1E293B] border border-[#E2E8F0] text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <BookOpen class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
              <span>探索職安知識庫</span>
            </RouterLink>

            <RouterLink
              to="/about"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-[#1E293B] border border-[#E2E8F0] text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Info class="h-4 w-4 text-[#64748B]" aria-hidden="true" />
              <span>了解專案架構</span>
            </RouterLink>
          </div>
        </div>

        <!-- Research Scope Notice -->
        <div class="w-80 shrink-0 rounded-md border border-amber-200 bg-amber-50/70 p-4 space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#D97706]">
            <AlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>研究用途與範圍聲明</span>
          </div>
          <p class="text-xs text-[#475569] leading-relaxed">
            本專案定位為自主學習與研究概念驗證（PoC），僅供技術展示與學術研究參考，不得取代合格職業安全衛生人員之專業判斷或法定正式風險評估。
          </p>
        </div>
      </div>
    </section>

    <!-- Motivation + Live System Status -->
    <div class="grid grid-cols-12 gap-6">
      <section class="col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-6 flex flex-col justify-between">
        <div>
          <h2 class="text-base font-semibold text-[#1E293B] mb-3">專案開發動機</h2>
          <blockquote class="border-l-4 border-[#0F766E] pl-4 py-1 text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] rounded-r-md pr-4">
            「本專案源於資訊技術與產業安全的跨領域學習構想，希望透過 AI Agent、知識檢索及風險評估方法，探索人工智慧在危害辨識、設備安全及產業防災上的應用可行性。」
          </blockquote>
        </div>
        <div class="mt-4 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <span>目標應用領域：職業安全衛生學習輔助、作業危害初篩研究</span>
          <RouterLink to="/learning-log" class="text-[#0F766E] font-medium hover:underline">
            檢視自主學習紀錄
          </RouterLink>
        </div>
      </section>

      <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-6" data-testid="system-status-panel">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold text-[#1E293B]">系統狀態總覽</h2>
          <span class="text-xs text-[#64748B]">即時檢查</span>
        </div>

        <dl class="space-y-3 text-sm">
          <div class="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-xs text-[#64748B] flex items-center gap-2">
              <Layers class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Frontend Version</span>
            </dt>
            <dd class="text-xs font-mono font-medium text-[#1E293B]">v{{ systemStore.frontendVersion }}</dd>
          </div>

          <div class="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-xs text-[#64748B] flex items-center gap-2">
              <Server class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Backend Connection</span>
            </dt>
            <dd>
              <StatusBadge :label="systemStore.backendStatusLabel" :tone="backendTone" />
            </dd>
          </div>

          <div class="flex items-center justify-between py-1.5 border-b border-[#F1F5F9]">
            <dt class="text-xs text-[#64748B] flex items-center gap-2">
              <Bot class="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Agent Status</span>
            </dt>
            <dd>
              <StatusBadge :label="systemStore.agentStatusLabel" :tone="agentTone" />
            </dd>
          </div>

          <div class="flex items-center justify-between py-1.5">
            <dt class="text-xs text-[#64748B] flex items-center gap-2">
              <Database class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Knowledge Base Status</span>
            </dt>
            <dd>
              <StatusBadge :label="systemStore.knowledgeBaseStatusLabel" :tone="knowledgeBaseTone" />
            </dd>
          </div>
        </dl>

        <p
          v-if="systemStore.backendStatus === 'disconnected'"
          class="mt-3 text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded px-3 py-2"
        >
          目前無法連線至後端 API，網站其餘靜態功能與介面架構仍可正常瀏覽。
        </p>
      </section>
    </div>

    <!-- Core Features -->
    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-[#1E293B]">核心功能模組</h2>
        <span class="text-xs text-[#64748B]">依據開發階段逐步建置中</span>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <RouterLink
          v-for="feature in coreFeatures"
          :key="feature.title"
          :to="feature.to"
          class="bg-white border border-[#E2E8F0] rounded-lg p-5 hover:border-[#0F766E] transition-colors flex flex-col justify-between gap-4"
        >
          <div class="space-y-2.5">
            <div class="flex items-center justify-between gap-2">
              <div class="h-9 w-9 rounded-md bg-teal-50 text-[#0F766E] flex items-center justify-center border border-teal-100">
                <component :is="feature.icon" class="h-4 w-4" aria-hidden="true" />
              </div>
              <StatusBadge :label="feature.status" :tone="feature.tone" :show-dot="false" />
            </div>
            <h3 class="text-sm font-semibold text-[#1E293B]">{{ feature.title }}</h3>
            <p class="text-xs text-[#64748B] leading-relaxed">{{ feature.description }}</p>
          </div>
          <div class="text-xs font-medium text-[#0F766E] flex items-center gap-1">
            <span>前往介面架構</span>
            <ArrowRight class="h-3.5 w-3.5" aria-hidden="true" />
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- Agent Workflow Architecture -->
    <AgentWorkflowDiagram />

    <!-- Future Research Directions -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6">
      <div class="flex items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-2">
          <Compass class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <h2 class="text-base font-semibold text-[#1E293B]">未來研究方向（Research Roadmap Concepts）</h2>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs px-2.5 py-1 rounded bg-slate-100 text-[#475569] border border-[#E2E8F0]">
            研究構想・尚未進行真實設備驗證
          </span>
          <RouterLink to="/future-research" class="text-xs font-medium text-[#0F766E] hover:underline">
            詳細構想說明
          </RouterLink>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="topic in futureTopics"
          :key="topic.title"
          class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2"
        >
          <div class="flex items-center gap-2 text-[#1E293B] font-medium text-sm">
            <component :is="topic.icon" class="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
            <span>{{ topic.title }}</span>
          </div>
          <p class="text-xs text-[#64748B] leading-relaxed">{{ topic.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
