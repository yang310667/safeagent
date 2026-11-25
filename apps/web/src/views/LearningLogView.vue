<script setup lang="ts">
import { BookMarked, CalendarClock, NotebookPen, User } from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';

const reservedFields = [
  { name: '學習日期', desc: '記錄實際修課或自主研讀之日期' },
  { name: '學習主題', desc: '對應職安法規、危害辨識或風險評估單元' },
  { name: '課程重點', desc: '整理關鍵法條概念、實務方法與名詞定義' },
  { name: '個人心得', desc: '記錄資訊技術與職安知識跨領域整合反思' },
  { name: '參考資料', desc: '附上教材章節或官方公開指引來源' },
];
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Developer Learning Background -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">自主學習紀錄（Self-Directed Learning Log）</h2>
          <StatusBadge label="持續累積中" tone="primary" />
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6 items-start">
        <div class="col-span-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-5 space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
            <User class="h-4 w-4" aria-hidden="true" />
            <span>開發者背景與學習規劃</span>
          </div>
          <p class="text-sm text-[#334155] leading-relaxed">
            專案開發者具有資訊相關科系背景，目前從事資訊系統與 APP 開發維運工作。為深化職業安全衛生專業知識並結合 AI 系統研發，已報名職業安全衛生管理員訓練課程，預計於 2026 年 12 月開始上課，未來將於本區持續整理實際學習成果與筆記。
          </p>
        </div>

        <div class="col-span-4 bg-white border border-[#E2E8F0] rounded-md p-5 space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#1E293B]">
            <CalendarClock class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>重要學習時程</span>
          </div>
          <div class="text-xs text-[#475569] space-y-1.5 pt-1">
            <div>· 職業安全衛生管理員課程：已報名</div>
            <div>· 預計開課時間：2026 年 12 月</div>
            <div>· 紀錄原則：僅記載實際完成之課程與學習心得，不預先編造未上課內容</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Reserved Log Structure & Empty State -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
        <NotebookPen class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
        <span>學習紀錄欄位架構</span>
      </h3>

      <div class="grid grid-cols-5 gap-3">
        <div
          v-for="field in reservedFields"
          :key="field.name"
          class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-1"
        >
          <div class="text-xs font-semibold text-[#1E293B] flex items-center gap-1.5">
            <BookMarked class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
            <span>{{ field.name }}</span>
          </div>
          <p class="text-[11px] text-[#64748B] leading-relaxed">{{ field.desc }}</p>
        </div>
      </div>

      <div class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-10 text-center space-y-1.5">
        <div class="text-sm font-medium text-[#1E293B]">目前尚無已完成之課程學習紀錄</div>
        <p class="text-xs text-[#64748B]">
          職業安全衛生管理員課程預計於 2026 年 12 月開課，開課後將陸續更新實際課程重點與學習心得。
        </p>
      </div>
    </section>
  </div>
</template>
