<script setup lang="ts">
import {
  AlertOctagon,
  Calculator,
  CheckCircle2,
  FileSearch,
  FlaskConical,
  HelpCircle,
  Link2,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';

const evaluationCriteria = [
  {
    title: '危害辨識完整性',
    desc: '檢查 Agent 針對特定作業情境是否能識別主要物理、化學、機械或環境危害項目。',
    icon: CheckCircle2,
  },
  {
    title: '法規引用正確性',
    desc: '比對所引用職業安全衛生法規條次與內容是否與官方現行公告一致。',
    icon: FileSearch,
  },
  {
    title: '資料來源可追溯性',
    desc: '確認每項安全建議與法規說明皆可追溯至知識庫內具名之官方資料來源。',
    icon: Link2,
  },
  {
    title: '風險計算正確性',
    desc: '驗證工程工具呼叫計算之風險矩陣數值與等級對照是否符合預期規則。',
    icon: Calculator,
  },
  {
    title: '資訊不足時的提問能力',
    desc: '測試當作業描述缺少關鍵條件（如高度、電壓、化學品濃度）時，Agent 是否能主動追問。',
    icon: HelpCircle,
  },
  {
    title: '無依據內容的產生情況',
    desc: '監測並統計模型是否產生未經工具檢索或無官方依據之推論內容（Hallucination Check）。',
    icon: AlertOctagon,
  },
];
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">Agent 評估與測試（Evaluation Framework）</h2>
          <StatusBadge label="Day 6 實作・尚未執行測試" tone="neutral" />
        </div>
        <p class="text-sm text-[#64748B]">
          定義 AI Agent 系統於職業安全領域應用之六項核心評估指標，於實際整合 OpenAI Responses API 後建立基準測試集並進行驗證。
        </p>
      </div>
    </section>

    <!-- Evaluation Criteria Grid -->
    <section class="grid grid-cols-3 gap-4">
      <div
        v-for="item in evaluationCriteria"
        :key="item.title"
        class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3"
      >
        <div class="flex items-center justify-between">
          <div class="h-8 w-8 rounded-md bg-teal-50 text-[#0F766E] border border-teal-100 flex items-center justify-center">
            <component :is="item.icon" class="h-4 w-4" aria-hidden="true" />
          </div>
          <StatusBadge label="尚未測試" tone="neutral" :show-dot="false" />
        </div>
        <h3 class="text-sm font-semibold text-[#1E293B]">{{ item.title }}</h3>
        <p class="text-xs text-[#64748B] leading-relaxed">{{ item.desc }}</p>
        <div class="pt-2 border-t border-[#F1F5F9] text-[11px] text-[#94A3B8]">
          指標結果：待實際測試後紀錄
        </div>
      </div>
    </section>

    <!-- Notice -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-center gap-3 text-xs text-[#64748B]">
      <FlaskConical class="h-4 w-4 text-[#0F766E] shrink-0" aria-hidden="true" />
      <span>
        原則聲明：在完成 Day 6 實際基準測試前，本頁面不顯示任何虛構的準確率、通過率或量化測試分數。
      </span>
    </section>
  </div>
</template>
