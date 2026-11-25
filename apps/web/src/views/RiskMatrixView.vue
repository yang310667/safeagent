<script setup lang="ts">
import { Grid2x2, Info } from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';

const likelihoodLevels = [
  { level: 5, label: '極可能 (5)' },
  { level: 4, label: '很可能 (4)' },
  { level: 3, label: '可能 (3)' },
  { level: 2, label: '較不可能 (2)' },
  { level: 1, label: '極不可能 (1)' },
];

const severityLevels = [
  { level: 1, label: '輕微 (1)' },
  { level: 2, label: '中度 (2)' },
  { level: 3, label: '嚴重 (3)' },
  { level: 4, label: '重大 (4)' },
  { level: 5, label: '災難性 (5)' },
];

// Visual matrix cell placeholder only; formal scoring rules await official guideline verification in Day 4.
function getPlaceholderTone(likelihood: number, severity: number) {
  const product = likelihood * severity;
  if (product >= 15) {
    return {
      text: '高風險區間',
      classes: 'bg-red-50 border-red-200 text-[#DC2626]',
    };
  }
  if (product >= 6) {
    return {
      text: '中風險區間',
      classes: 'bg-amber-50 border-amber-200 text-[#D97706]',
    };
  }
  return {
    text: '低風險區間',
    classes: 'bg-emerald-50 border-emerald-200 text-[#16A34A]',
  };
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">5×5 風險矩陣評估（Risk Matrix）</h2>
          <StatusBadge label="Day 1 介面骨架・尚未實作正式計算規則" tone="warning" />
        </div>
        <p class="text-sm text-[#64748B]">
          結合發生可能性與後果嚴重度進行風險視覺化呈現，並預留改善前風險與剩餘風險對照紀錄。
        </p>
      </div>
    </section>

    <!-- Notice -->
    <div class="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start gap-2.5 text-xs text-[#475569]">
      <Info class="h-4 w-4 text-[#D97706] shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        Day 1 僅建立風險矩陣介面骨架，尚未實作正式風險分級與計算規則，待後續確認勞動部職安署官方風險評估指引後再於 Day 4 開發。下方格位僅為 5×5 矩陣結構示意，所有風險等級皆同時標示文字與色彩。
      </span>
    </div>

    <!-- 5x5 Matrix + Assessment Record Skeleton -->
    <div class="grid grid-cols-12 gap-6 items-start">
      <section class="col-span-8 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <Grid2x2 class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>5×5 風險矩陣結構（發生可能性 × 後果嚴重度）</span>
          </h3>
          <div class="flex items-center gap-3 text-xs">
            <span class="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[#16A34A] font-medium">低風險</span>
            <span class="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[#D97706] font-medium">中風險</span>
            <span class="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-[#DC2626] font-medium">高風險</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th class="border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-left text-[#475569] font-semibold w-32">
                  可能性 \ 嚴重度
                </th>
                <th
                  v-for="sev in severityLevels"
                  :key="sev.level"
                  class="border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-center text-[#1E293B] font-semibold"
                >
                  {{ sev.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lik in likelihoodLevels" :key="lik.level">
                <th class="border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 text-left text-[#1E293B] font-semibold">
                  {{ lik.label }}
                </th>
                <td
                  v-for="sev in severityLevels"
                  :key="`${lik.level}-${sev.level}`"
                  class="border border-[#E2E8F0] p-2.5 text-center"
                  :class="getPlaceholderTone(lik.level, sev.level).classes"
                >
                  <div class="font-semibold">{{ getPlaceholderTone(lik.level, sev.level).text }}</div>
                  <div class="text-[11px] opacity-80 mt-0.5">({{ lik.level }}, {{ sev.level }})</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Pre-control / Residual Risk & Assessment Log -->
      <section class="col-span-4 space-y-4">
        <div class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
          <h3 class="text-sm font-semibold text-[#1E293B]">改善前與剩餘風險欄位（預留）</h3>
          <div class="space-y-2.5 text-xs">
            <div class="p-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
              <div class="font-medium text-[#1E293B]">發生可能性 / 後果嚴重度</div>
              <div class="text-[#64748B] mt-1">尚未選擇作業危害項目（需由人工確認）</div>
            </div>
            <div class="p-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
              <div class="font-medium text-[#1E293B]">改善前風險（Initial Risk）</div>
              <div class="text-[#64748B] mt-1">待 Day 4 定義官方風險分級邏輯</div>
            </div>
            <div class="p-3 rounded-md border border-[#E2E8F0] bg-[#F8FAFC]">
              <div class="font-medium text-[#1E293B]">剩餘風險（Residual Risk）</div>
              <div class="text-[#64748B] mt-1">評估採行控制措施後之殘餘風險等級</div>
            </div>
          </div>
        </div>

        <div class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-3">
          <h3 class="text-sm font-semibold text-[#1E293B]">風險評估紀錄</h3>
          <div class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-6 text-center text-xs text-[#64748B]">
            尚無風險評估紀錄
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
