<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { KnowledgeCategory, LearningLogEntry, LearningPlanItem } from '@safeagent/shared';
import {
  ArrowRight,
  BookMarked,
  Bot,
  CalendarClock,
  CheckSquare,
  Download,
  Loader2,
  NotebookPen,
  Plus,
  Sparkles,
  Square,
  Trash2,
  User,
} from 'lucide-vue-next';
import StatusBadge from '@/components/StatusBadge.vue';
import { ApiClientError } from '@/services/api-client';
import { requestLearningPlan } from '@/services/learning.service';
import { useLearningStore } from '@/stores/learning';
import { useRiskStore } from '@/stores/risk';
import { useSystemStore } from '@/stores/system';

const router = useRouter();
const systemStore = useSystemStore();
const learningStore = useLearningStore();
const riskStore = useRiskStore();

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

// AI Learning Planner State
const planGoal = ref('預備 2026 年 12 月職業安全衛生管理員課程，系統性補強職安法規、高處與機械安全及 AI 風險評估應用');
const weeklyHours = ref(5);
const targetWeeks = ref(4);
const selectedFocusCategories = ref<KnowledgeCategory[]>([
  '職業安全衛生法規',
  '危害辨識',
  '風險評估',
  '高處作業',
]);
const isGeneratingPlan = ref(false);
const planError = ref<string | null>(null);

// Manual Completed Learning Log Form State
const studyDate = ref(new Date().toISOString().slice(0, 10));
const topic = ref('');
const logCategory = ref<KnowledgeCategory>('職安基礎');
const keyTakeawaysText = ref('');
const reflection = ref('');
const referencesText = ref('');
const logFormError = ref<string | null>(null);

const isAgentEnabled = computed(() => Boolean(systemStore.config?.agentEnabled));

function toggleFocusCategory(cat: KnowledgeCategory): void {
  if (selectedFocusCategories.value.includes(cat)) {
    selectedFocusCategories.value = selectedFocusCategories.value.filter((item) => item !== cat);
  } else {
    selectedFocusCategories.value = [...selectedFocusCategories.value, cat];
  }
}

async function handleGenerateAiPlan(): Promise<void> {
  if (!planGoal.value.trim() || !isAgentEnabled.value || isGeneratingPlan.value) return;

  isGeneratingPlan.value = true;
  planError.value = null;

  try {
    const plan = await requestLearningPlan({
      goal: planGoal.value.trim(),
      weeklyHours: weeklyHours.value,
      targetWeeks: targetWeeks.value,
      focusCategories: selectedFocusCategories.value,
      completedTopics: learningStore.logs.map((l) => l.topic),
    });
    learningStore.setLatestPlan(plan);
  } catch (err) {
    planError.value =
      err instanceof ApiClientError ? err.message : '呼叫 AI 學習規劃助手失敗';
  } finally {
    isGeneratingPlan.value = false;
  }
}

function handleConvertPlanItemToDraft(item: LearningPlanItem): void {
  topic.value = item.topic;
  logCategory.value = item.category;
  keyTakeawaysText.value = item.objectives.join('\n');
  referencesText.value = item.recommendedSources.join('\n');
  reflection.value = '';
}

function handlePracticePromptInWorkspace(prompt: string): void {
  riskStore.setWorkspacePromptDraft(prompt);
  void router.push('/workspace');
}

function handleAddLearningLog(): void {
  logFormError.value = null;
  if (!topic.value.trim() || !reflection.value.trim()) {
    logFormError.value = '請填寫實際完成之「學習主題」與「個人心得」。';
    return;
  }

  const entry: LearningLogEntry = {
    id: `log-${Date.now()}`,
    studyDate: studyDate.value || new Date().toISOString().slice(0, 10),
    topic: topic.value.trim(),
    category: logCategory.value,
    keyTakeaways: keyTakeawaysText.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    reflection: reflection.value.trim(),
    references: referencesText.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    createdAt: new Date().toISOString(),
  };

  learningStore.addLog(entry);
  topic.value = '';
  keyTakeawaysText.value = '';
  reflection.value = '';
  referencesText.value = '';
}

function handleExportLogsMarkdown(): void {
  if (learningStore.logs.length === 0) return;
  const lines = [
    '# SafeAgent 自主學習紀錄彙整',
    '',
    ...learningStore.logs.flatMap((log) => [
      `## ${log.studyDate}｜${log.topic}（${log.category}）`,
      '',
      '### 課程／研讀重點',
      ...(log.keyTakeaways.length > 0 ? log.keyTakeaways.map((k) => `- ${k}`) : ['- （無）']),
      '',
      '### 個人心得',
      log.reflection,
      '',
      '### 參考資料',
      ...(log.references.length > 0 ? log.references.map((r) => `- ${r}`) : ['- （無）']),
      '',
      '---',
      '',
    ]),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `safeagent-learning-logs-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Developer Learning Background -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <h2 class="text-lg font-semibold text-[#1E293B]">自主學習紀錄與 AI 規劃（Self-Directed Learning）</h2>
          <StatusBadge label="持續累積中・已啟用紀錄與 AI 排程" tone="primary" />
        </div>
      </div>

      <div class="grid grid-cols-12 gap-6 items-start">
        <div class="col-span-8 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-5 space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#0F766E]">
            <User class="h-4 w-4" aria-hidden="true" />
            <span>開發者背景與學習規劃</span>
          </div>
          <p class="text-sm text-[#334155] leading-relaxed">
            專案開發者具有資訊相關科系背景，目前從事資訊系統與 APP 開發維運工作。為深化職業安全衛生專業知識並結合 AI 系統研發，已報名職業安全衛生管理員訓練課程，預計於 2026 年 12 月開始上課，並透過本頁管理自主讀書計畫與實際學習心得。
          </p>
        </div>

        <div class="col-span-4 bg-white border border-[#E2E8F0] rounded-md p-5 space-y-2">
          <div class="flex items-center gap-2 text-xs font-semibold text-[#1E293B]">
            <CalendarClock class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>重要學習時程與紀錄原則</span>
          </div>
          <div class="text-xs text-[#475569] space-y-1.5 pt-1">
            <div>· 職業安全衛生管理員課程：已報名（2026/12 開課）</div>
            <div>· AI 排程僅作為待執行建議，不計入已完成紀錄</div>
            <div>· 下方紀錄區僅保存使用者親自填寫之實際心得</div>
          </div>
        </div>
      </div>
    </section>

    <!-- AI Learning Planner Section -->
    <section class="bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-5" data-testid="ai-planner-section">
      <div class="flex items-center justify-between gap-4 border-b border-[#E2E8F0] pb-3">
        <div>
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <Sparkles class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>AI 自主學習排程規劃（依據 SafeAgent 知識庫推薦進度）</span>
          </h3>
          <p class="text-xs text-[#64748B] mt-0.5">
            由 OpenAI 結合系統現有官方知識庫與案例產生每週學習建議，完成後可轉為學習紀錄或直接帶入 AI 工作台練習。
          </p>
        </div>
        <StatusBadge
          :label="isAgentEnabled ? 'AI 規劃可用' : 'AI 規劃未啟用（需後端 Agent）'"
          :tone="isAgentEnabled ? 'success' : 'neutral'"
          :show-dot="false"
        />
      </div>

      <form class="grid grid-cols-12 gap-4 text-xs" @submit.prevent="handleGenerateAiPlan">
        <div class="col-span-6">
          <label class="block font-semibold text-[#475569] mb-1" for="plan-goal">學習目標描述</label>
          <input
            id="plan-goal"
            v-model="planGoal"
            data-testid="plan-goal-input"
            type="text"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-2">
          <label class="block font-semibold text-[#475569] mb-1" for="plan-hours">每週可學習時數</label>
          <input
            id="plan-hours"
            v-model.number="weeklyHours"
            type="number"
            min="1"
            max="40"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-2">
          <label class="block font-semibold text-[#475569] mb-1" for="plan-weeks">規劃週數</label>
          <input
            id="plan-weeks"
            v-model.number="targetWeeks"
            type="number"
            min="1"
            max="12"
            class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
          />
        </div>

        <div class="col-span-2 flex items-end">
          <button
            type="submit"
            :disabled="!isAgentEnabled || isGeneratingPlan"
            data-testid="generate-plan-btn"
            class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold transition-colors"
            :class="
              isAgentEnabled && !isGeneratingPlan
                ? 'bg-[#0F766E] text-white hover:bg-[#0D655E] cursor-pointer'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed'
            "
          >
            <Loader2 v-if="isGeneratingPlan" class="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <Bot v-else class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ isGeneratingPlan ? '規劃中...' : 'AI 安排學習' }}</span>
          </button>
        </div>

        <div class="col-span-12 space-y-1.5">
          <div class="font-semibold text-[#475569]">重點學習領域（可複選）</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="cat in categories"
              :key="cat"
              type="button"
              class="px-2.5 py-1 rounded text-[11px] border cursor-pointer transition-colors"
              :class="
                selectedFocusCategories.includes(cat)
                  ? 'bg-[#0F766E] text-white border-[#0F766E]'
                  : 'bg-white text-[#475569] border-[#E2E8F0] hover:bg-slate-50'
              "
              @click="toggleFocusCategory(cat)"
            >
              {{ cat }}
            </button>
          </div>
        </div>
      </form>

      <p v-if="planError" class="text-xs text-[#DC2626] bg-red-50 border border-red-200 rounded px-3 py-2">
        {{ planError }}
      </p>

      <!-- Rendered AI Study Schedule -->
      <div v-if="learningStore.latestPlan" class="space-y-4 pt-2" data-testid="ai-plan-output">
        <div class="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-4">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[#1E293B]">{{ learningStore.latestPlan.planTitle }}</span>
              <StatusBadge label="AI 建議待執行計畫" tone="warning" :show-dot="false" />
            </div>
            <p class="text-xs text-[#475569]">{{ learningStore.latestPlan.studyAdvice }}</p>
          </div>
          <span class="text-[11px] font-mono text-[#64748B] shrink-0">{{ learningStore.latestPlan.model }}</span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div
            v-for="item in learningStore.latestPlan.weeklySchedule"
            :key="item.weekLabel"
            class="rounded-md border p-4 space-y-2.5 text-xs transition-colors"
            :class="
              learningStore.completedWeekLabels.includes(item.weekLabel)
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-[#E2E8F0] bg-white'
            "
          >
            <div class="flex items-center justify-between gap-2">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 font-semibold text-[#1E293B] cursor-pointer"
                @click="learningStore.toggleWeekDone(item.weekLabel)"
              >
                <CheckSquare
                  v-if="learningStore.completedWeekLabels.includes(item.weekLabel)"
                  class="h-4 w-4 text-[#16A34A]"
                  aria-hidden="true"
                />
                <Square v-else class="h-4 w-4 text-[#64748B]" aria-hidden="true" />
                <span>{{ item.weekLabel }}｜{{ item.topic }}</span>
              </button>
              <span class="text-[11px] px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200 shrink-0">
                {{ item.category }} · {{ item.estimatedHours }}h
              </span>
            </div>

            <ul class="space-y-1 text-[#475569]">
              <li v-for="obj in item.objectives" :key="obj">· {{ obj }}</li>
            </ul>

            <div v-if="item.recommendedSources.length > 0" class="text-[11px] text-[#64748B]">
              建議研讀：{{ item.recommendedSources.join('、') }}
            </div>

            <div class="flex flex-wrap gap-2 pt-1">
              <button
                v-if="item.practicePrompt"
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#0F766E] text-[#0F766E] hover:bg-teal-50 text-[11px] cursor-pointer"
                @click="handlePracticePromptInWorkspace(item.practicePrompt)"
              >
                <span>帶入工作台練習</span>
                <ArrowRight class="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E2E8F0] text-[#334155] hover:bg-slate-50 text-[11px] cursor-pointer"
                @click="handleConvertPlanItemToDraft(item)"
              >
                <span>讀完後轉為紀錄草稿</span>
              </button>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-[#64748B]">{{ learningStore.latestPlan.disclaimer }}</p>
      </div>
    </section>

    <!-- Add Completed Learning Log + List -->
    <div class="grid grid-cols-12 gap-6 items-start">
      <section class="col-span-5 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
          <Plus class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
          <span>新增已完成自主學習紀錄</span>
        </h3>

        <form class="space-y-3 text-xs" @submit.prevent="handleAddLearningLog">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#475569] mb-1" for="log-date">學習日期</label>
              <input
                id="log-date"
                v-model="studyDate"
                type="date"
                class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
              />
            </div>
            <div>
              <label class="block font-semibold text-[#475569] mb-1" for="log-cat">分類</label>
              <select
                id="log-cat"
                v-model="logCategory"
                class="w-full rounded border border-[#CBD5E1] bg-white px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
              >
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="log-topic">學習主題</label>
            <input
              id="log-topic"
              v-model="topic"
              data-testid="log-topic-input"
              type="text"
              placeholder="例如：職業安全衛生設施規則第57條上鎖掛牌實務研讀"
              class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="log-takeaways">課程／研讀重點（每行一項）</label>
            <textarea
              id="log-takeaways"
              v-model="keyTakeawaysText"
              rows="3"
              placeholder="條列整理實際學到的法規概念或實務要點"
              class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="log-reflection">個人心得與跨領域整合反思</label>
            <textarea
              id="log-reflection"
              v-model="reflection"
              data-testid="log-reflection-input"
              rows="3"
              placeholder="記錄資訊系統實務與職安衛生管理結合的心得"
              class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#475569] mb-1" for="log-refs">參考資料（每行一項）</label>
            <textarea
              id="log-refs"
              v-model="referencesText"
              rows="2"
              placeholder="例如：全國法規資料庫 N0060013"
              class="w-full rounded border border-[#CBD5E1] px-3 py-2 text-xs focus:border-[#0F766E] focus:outline-none"
            />
          </div>

          <p v-if="logFormError" data-testid="log-form-error" class="text-xs text-[#DC2626] font-medium">
            {{ logFormError }}
          </p>

          <button
            type="submit"
            data-testid="save-learning-log-btn"
            class="w-full py-2.5 rounded bg-[#0F766E] text-white font-semibold hover:bg-[#0D655E] cursor-pointer"
          >
            儲存學習紀錄
          </button>
        </form>
      </section>

      <section class="col-span-7 bg-white border border-[#E2E8F0] rounded-lg p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <h3 class="text-sm font-semibold text-[#1E293B] flex items-center gap-2">
            <NotebookPen class="h-4 w-4 text-[#0F766E]" aria-hidden="true" />
            <span>已完成學習紀錄列表（共 {{ learningStore.logs.length }} 筆）</span>
          </h3>
          <button
            v-if="learningStore.logs.length > 0"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#E2E8F0] text-xs text-[#475569] hover:bg-slate-50 cursor-pointer"
            @click="handleExportLogsMarkdown"
          >
            <Download class="h-3.5 w-3.5" aria-hidden="true" />
            <span>匯出 Markdown 筆記</span>
          </button>
        </div>

        <div
          v-if="learningStore.logs.length === 0"
          data-testid="learning-logs-empty"
          class="border border-dashed border-[#CBD5E1] rounded-md bg-[#F8FAFC] p-10 text-center space-y-1.5"
        >
          <div class="text-sm font-medium text-[#1E293B]">目前尚無已完成之課程學習紀錄</div>
          <p class="text-xs text-[#64748B]">
            職業安全衛生管理員課程預計於 2026 年 12 月開課；您可先透過上方「AI 安排學習」建立讀書計畫，實際研讀後再由左側表單記錄真實心得。
          </p>
        </div>

        <ul v-else class="space-y-3" data-testid="learning-log-list">
          <li
            v-for="entry in learningStore.logs"
            :key="entry.id"
            class="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2 text-xs"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-mono text-[#0F766E] font-semibold">{{ entry.studyDate }}</span>
                <span class="px-2 py-0.5 rounded bg-teal-50 text-[#0F766E] border border-teal-200 text-[11px]">
                  {{ entry.category }}
                </span>
              </div>
              <button
                type="button"
                aria-label="刪除此學習紀錄"
                class="p-1 text-[#64748B] hover:text-[#DC2626] cursor-pointer"
                @click="learningStore.removeLog(entry.id)"
              >
                <Trash2 class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <div class="text-sm font-semibold text-[#1E293B]">{{ entry.topic }}</div>

            <ul v-if="entry.keyTakeaways.length > 0" class="space-y-1 text-[#334155]">
              <li v-for="takeaway in entry.keyTakeaways" :key="takeaway">· {{ takeaway }}</li>
            </ul>

            <p class="text-[#475569] leading-relaxed bg-white border border-[#E2E8F0] rounded p-3">
              {{ entry.reflection }}
            </p>

            <div v-if="entry.references.length > 0" class="flex items-center gap-1.5 text-[11px] text-[#64748B]">
              <BookMarked class="h-3.5 w-3.5 text-[#0F766E]" aria-hidden="true" />
              <span>參考資料：{{ entry.references.join('、') }}</span>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
