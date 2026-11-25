<script setup lang="ts">
import { ArrowRight, CheckSquare, Cpu, Database, FileText, MessageSquareText, Search } from 'lucide-vue-next';

const steps = [
  {
    step: '01',
    title: '作業情境輸入',
    desc: '描述作業環境、設備與施工條件',
    icon: MessageSquareText,
  },
  {
    step: '02',
    title: 'Agent 任務解析',
    desc: '拆解作業類型與評估目標',
    icon: Cpu,
  },
  {
    step: '03',
    title: '知識檢索與工具呼叫',
    desc: '查詢法規指引與職災案例庫',
    icon: Database,
  },
  {
    step: '04',
    title: '危害辨識',
    desc: '整理潛在物理、化學與作業危害',
    icon: Search,
  },
  {
    step: '05',
    title: '補充資訊確認',
    desc: '針對缺少之現場條件進行追問',
    icon: CheckSquare,
  },
  {
    step: '06',
    title: '初步風險評估報告',
    desc: '產出結構化評估摘要與來源引用',
    icon: FileText,
  },
];
</script>

<template>
  <div class="bg-white border border-[#E2E8F0] rounded-lg p-6">
    <div class="flex items-center justify-between gap-4 mb-5">
      <div>
        <h2 class="text-base font-semibold text-[#1E293B]">Agent 系統架構流程（Architecture Workflow）</h2>
        <p class="text-xs text-[#64748B] mt-1">
          此流程圖僅為系統架構說明，不代表已完成實際 Agent 分析。
        </p>
      </div>
      <span class="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-[#475569] border border-[#E2E8F0] shrink-0">
        架構示意
      </span>
    </div>

    <div class="grid grid-cols-6 gap-2 items-stretch">
      <div
        v-for="(item, index) in steps"
        :key="item.step"
        class="relative flex items-center"
      >
        <div class="w-full h-full rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex flex-col justify-between">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[11px] font-mono font-semibold text-[#0F766E]">STEP {{ item.step }}</span>
            <component :is="item.icon" class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          </div>
          <div>
            <div class="text-xs font-semibold text-[#1E293B] leading-snug">{{ item.title }}</div>
            <div class="text-[11px] text-[#64748B] mt-1 leading-relaxed">{{ item.desc }}</div>
          </div>
        </div>
        <ArrowRight
          v-if="index < steps.length - 1"
          class="h-4 w-4 text-[#94A3B8] shrink-0 -mr-2.5 ml-0.5 z-10"
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
</template>
