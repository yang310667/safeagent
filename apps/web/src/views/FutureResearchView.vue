<script setup lang="ts">
import {
  BellRing,
  Camera,
  CloudSun,
  Compass,
  Database,
  Info,
  Radar,
  Thermometer,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';

const researchModules = [
  {
    title: '無人機自主巡檢',
    desc: '規劃針對廠區頂樓等高處及不易抵達之空氣污染防制設備區域，研究預設航線巡檢流程以降低人工登高暴露風險。',
    icon: Radar,
  },
  {
    title: '熱影像與可見光影像',
    desc: '整合雙光影像資料（紅外線熱像圖與可見光照片），輔助定位設備異常發熱部位與周邊結構環境。',
    icon: Camera,
  },
  {
    title: '設備異常溫升辨識',
    desc: '針對排氣風車軸承、馬達外殼及電氣接點等關鍵組件，探索以溫升特徵作為早期異常辨識依據。',
    icon: Thermometer,
  },
  {
    title: '環境干擾補償',
    desc: '考量頂樓戶外環境之日照輻射、風速冷卻效應與環境背景溫度變化，探討輻射校正與干擾補償方法。',
    icon: CloudSun,
  },
  {
    title: '設備歷史資料分析',
    desc: '結合過往巡檢溫度紀錄與設備運轉負載資料，建立長期趨勢比較基礎以降低單次誤判機率。',
    icon: Database,
  },
  {
    title: '異常預警與安全管理',
    desc: '將異常溫升警示與維修作業安全評估流程串接，協助現場人員在維修前預先掌握潛在危害。',
    icon: BellRing,
  },
];
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Research Concept Header -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-3">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
          <Compass class="h-4 w-4" aria-hidden="true" />
          <span>未來研究構想（Research Concept）</span>
        </div>
        <StatusBadge label="僅為研究構想・未實作模擬器與真實數據" tone="warning" />
      </div>

      <h2 class="text-xl font-bold text-[#1E293B] leading-snug">
        「成廠區頂樓空氣污染防制設備之無人機熱像巡檢與異常溫升預警」
      </h2>

      <p class="text-sm text-[#475569] leading-relaxed max-w-4xl">
        本研究構想延伸 SafeAgent 在軟體層面的危害辨識與知識檢索能力，進一步探索結合無人機熱影像巡檢與設備狀態監測於廠區頂樓設備安全管理的可行性。目前本項目屬於碩士研究方向構想階段，尚未建置實體設備實驗或產生模擬數據。
      </p>
    </section>

    <!-- Research Scope Warning -->
    <div class="rounded-lg border border-slate-200 bg-white px-4 py-3 flex items-start gap-2.5 text-xs text-[#475569]">
      <Info class="h-4 w-4 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
      <span>
        研究邊界說明：本頁面僅呈現研究問題定義與系統構想模組，不包含無人機模擬器，亦不生成虛構的巡檢溫度曲線或設備故障率數據。
      </span>
    </div>

    <!-- 6 Research Concept Modules -->
    <section class="grid grid-cols-3 gap-4">
      <div
        v-for="mod in researchModules"
        :key="mod.title"
        class="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-2.5"
      >
        <div class="h-9 w-9 rounded-md bg-teal-50 text-[#0F766E] border border-teal-100 flex items-center justify-center">
          <component :is="mod.icon" class="h-4 w-4" aria-hidden="true" />
        </div>
        <h3 class="text-sm font-semibold text-[#1E293B]">{{ mod.title }}</h3>
        <p class="text-xs text-[#64748B] leading-relaxed">{{ mod.desc }}</p>
      </div>
    </section>
  </div>
</template>
