<script setup lang="ts">
import { ref } from 'vue';
import { AlertTriangle, Building2, ExternalLink, Search, ShieldAlert } from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';

const searchQuery = ref('');
const selectedIndustry = ref('');
const selectedHazardType = ref('');

const reservedIndustries = ['製造業', '營造業', '化學工業', '倉儲與運輸業', '公用事業與設備維護'];
const reservedHazardTypes = ['墜落、滾落', '感電', '被夾、被捲', '物體飛落', '火災與爆炸', '有害物接觸'];
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">職災案例分析（Occupational Accident Cases）</h2>
          <StatusBadge label="Day 2 建置中・未匯入案例" tone="warning" />
        </div>
        <p class="text-sm text-[#64748B]">
          整理公開職災案例之事故經過、發生原因與預防措施，作為作業危害辨識與安全教育參考。嚴禁自行編造真實事故。
        </p>
      </div>
    </section>

    <!-- Search & Filters -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 grid grid-cols-12 gap-4">
      <div class="col-span-5">
        <label class="block text-xs font-medium text-[#475569] mb-1.5" for="case-search">案例搜尋</label>
        <div class="relative">
          <Search class="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="case-search"
            v-model="searchQuery"
            type="text"
            placeholder="輸入設備、作業類型或關鍵字"
            class="w-full rounded-md border border-[#CBD5E1] pl-9 pr-3 py-2 text-sm focus:border-[#0F766E] focus:outline-none"
          />
        </div>
      </div>

      <div class="col-span-3">
        <label class="block text-xs font-medium text-[#475569] mb-1.5" for="industry-filter">產業分類</label>
        <select
          id="industry-filter"
          v-model="selectedIndustry"
          class="w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
        >
          <option value="">全部產業分類</option>
          <option v-for="ind in reservedIndustries" :key="ind" :value="ind">{{ ind }}</option>
        </select>
      </div>

      <div class="col-span-3">
        <label class="block text-xs font-medium text-[#475569] mb-1.5" for="hazard-filter">危害類型</label>
        <select
          id="hazard-filter"
          v-model="selectedHazardType"
          class="w-full rounded-md border border-[#CBD5E1] bg-white px-3 py-2 text-sm text-[#1E293B] focus:border-[#0F766E] focus:outline-none"
        >
          <option value="">全部危害類型</option>
          <option v-for="haz in reservedHazardTypes" :key="haz" :value="haz">{{ haz }}</option>
        </select>
      </div>

      <div class="col-span-1 flex items-end">
        <button
          type="button"
          disabled
          class="w-full py-2 rounded-md bg-slate-200 text-slate-500 text-sm font-medium cursor-not-allowed"
        >
          篩選
        </button>
      </div>
    </section>

    <!-- Reserved Case Schema & Empty State -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5">
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
          <AlertTriangle class="h-4 w-4 text-[#D97706]" aria-hidden="true" />
          <span>案例結構欄位規劃</span>
        </h3>
        <span class="text-xs text-[#64748B]">需附帶官方公開來源</span>
      </div>

      <div class="grid grid-cols-4 gap-4">
        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <Building2 class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>事故經過</span>
          </div>
          <p class="text-xs text-[#64748B]">依據公開職災檢查摘要記載之作業流程與事件發生經過。</p>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <ShieldAlert class="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
            <span>事故原因</span>
          </div>
          <p class="text-xs text-[#64748B]">區分直接原因、間接原因與基本管理面原因。</p>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
          <div class="text-xs font-semibold text-[#1E293B]">預防措施</div>
          <p class="text-xs text-[#64748B]">彙整工程控制、管理措施及個人防護具改善建議。</p>
        </div>

        <div class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <ExternalLink class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>官方資料來源</span>
          </div>
          <p class="text-xs text-[#64748B]">註明發布機關、案例編號或官方公開網址以供查核。</p>
        </div>
      </div>

      <div class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-8 text-center space-y-1.5">
        <div class="text-sm font-medium text-[#1E293B]">目前尚未匯入公開職災案例資料</div>
        <p class="text-xs text-[#64748B]">
          Day 1 僅完成介面骨架建置，不自行編造真實事故案例。將於 Day 2 依據官方公開來源整理收錄。
        </p>
      </div>
    </section>
  </div>
</template>
