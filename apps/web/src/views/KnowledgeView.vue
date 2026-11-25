<script setup lang="ts">
import { ref } from 'vue';
import type { KnowledgeCategory } from '@safeagent/shared';
import { BookOpen, Calendar, ExternalLink, Search } from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';

const categories: KnowledgeCategory[] = [
  '職安基礎',
  '職業安全衛生法規',
  '危害辨識',
  '風險評估',
  '製程安全',
  '機械安全',
  '電氣安全',
  '高處作業',
  '化學品安全',
  '智慧工安',
];

const searchQuery = ref('');
const selectedCategory = ref<KnowledgeCategory | '全部'>('全部');
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header Banner -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 flex items-start justify-between gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">職安知識庫（Knowledge Base）</h2>
          <StatusBadge label="Day 2 建置中・尚未載入正式資料" tone="warning" />
        </div>
        <p class="text-sm text-[#64748B]">
          提供職業安全衛生法規、危害辨識指引與作業安全知識之結構化檢索介面，所有條目皆須附帶官方資料來源與更新日期。
        </p>
      </div>
    </section>

    <!-- Search & Category Filter -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-center gap-3">
        <div class="relative flex-1">
          <Search class="h-4 w-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="輸入關鍵字搜尋職安知識（Day 1 介面骨架，尚未接入資料索引）"
            class="w-full rounded-md border border-[#CBD5E1] pl-9 pr-4 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0F766E] focus:outline-none"
          />
        </div>
        <button
          type="button"
          disabled
          class="px-4 py-2 rounded-md bg-slate-200 text-slate-500 text-sm font-medium cursor-not-allowed"
        >
          搜尋知識庫
        </button>
      </div>

      <div class="space-y-2">
        <div class="text-xs font-semibold text-[#475569]">知識分類</div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer"
            :class="
              selectedCategory === '全部'
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
            "
            @click="selectedCategory = '全部'"
          >
            全部分類
          </button>
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            class="px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer"
            :class="
              selectedCategory === cat
                ? 'bg-[#0F766E] text-white border-[#0F766E]'
                : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
            "
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </section>

    <!-- Article List Skeleton -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
          <BookOpen class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>文章列表（目前篩選：{{ selectedCategory }}）</span>
        </h3>
        <div class="flex items-center gap-4 text-xs text-[#64748B]">
          <span class="flex items-center gap-1">
            <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
            <span>預留欄位：官方資料來源</span>
          </span>
          <span class="flex items-center gap-1">
            <Calendar class="h-3.5 w-3.5" aria-hidden="true" />
            <span>預留欄位：更新日期</span>
          </span>
        </div>
      </div>

      <div class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-10 text-center space-y-2">
        <div class="text-sm font-medium text-[#1E293B]">知識庫文章尚待 Day 2 蒐集並查證官方資料後匯入</div>
        <p class="text-xs text-[#64748B] max-w-xl mx-auto leading-relaxed">
          為確保資訊正確性與可追溯性，Day 1 不預填任何未經查證之法規條文或摘錄內容。正式資料將依據勞動部職業安全衛生署與全國法規資料庫整理建檔。
        </p>
      </div>
    </section>
  </div>
</template>
