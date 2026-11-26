<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Bot,
  ChevronRight,
  Compass,
  ExternalLink,
  FlaskConical,
  Github,
  Grid2x2,
  HelpCircle,
  Home,
  Info,
  NotebookPen,
  RefreshCw,
  ShieldCheck,
} from 'lucide-vue-next';
import StatusBadge, { type BadgeTone } from '@/components/StatusBadge.vue';
import { useSystemStore } from '@/stores/system';

const route = useRoute();
const systemStore = useSystemStore();

onMounted(() => {
  if (!systemStore.initialized) {
    void systemStore.checkSystemStatus();
  }
});

interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: '專案首頁', to: '/', icon: Home },
      { label: '使用說明與範例', to: '/guide', icon: HelpCircle },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'AI 風險評估', to: '/workspace', icon: Bot },
      { label: '風險矩陣', to: '/risk-matrix', icon: Grid2x2 },
    ],
  },
  {
    title: 'Knowledge',
    items: [
      { label: '職安知識庫', to: '/knowledge', icon: BookOpen },
      { label: '職災案例', to: '/accident-cases', icon: AlertTriangle },
    ],
  },
  {
    title: 'Research',
    items: [
      { label: '自主學習紀錄', to: '/learning-log', icon: NotebookPen },
      { label: 'Agent 評估與測試', to: '/evaluation', icon: FlaskConical },
      { label: '未來研究方向', to: '/future-research', icon: Compass },
    ],
  },
];

const currentPageTitle = computed(() =>
  typeof route.meta?.title === 'string' ? route.meta.title : '專案首頁',
);

const currentGroupTitle = computed(() =>
  typeof route.meta?.group === 'string' ? route.meta.group : 'Overview',
);

const backendBadgeTone = computed<BadgeTone>(() => {
  if (systemStore.backendStatus === 'connected') return 'success';
  if (systemStore.backendStatus === 'checking') return 'warning';
  return 'danger';
});

const agentBadgeTone = computed<BadgeTone>(() => {
  if (systemStore.backendStatus === 'connected' && systemStore.config?.agentEnabled) {
    return 'primary';
  }
  return 'neutral';
});

function handleRefreshStatus() {
  void systemStore.checkSystemStatus();
}
</script>

<template>
  <div class="min-h-screen flex bg-[#F8FAFC] text-[#1E293B]">
    <!-- Fixed Left Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-30 w-60 bg-[#0F172A] text-slate-200 flex flex-col border-r border-slate-800 select-none"
      aria-label="主導覽側邊欄"
    >
      <!-- Brand / Logo -->
      <div class="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80 shrink-0">
        <div
          class="h-9 w-9 rounded-lg bg-[#0F766E] flex items-center justify-center text-white shrink-0 border border-teal-500/30"
          aria-hidden="true"
        >
          <ShieldCheck class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <div class="text-sm font-semibold tracking-wide text-white truncate">SafeAgent</div>
          <div class="text-[11px] text-slate-400 truncate">產業安全風險研究平台</div>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="功能頁面導覽">
        <div v-for="group in navGroups" :key="group.title">
          <div class="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {{ group.title }}
          </div>
          <ul class="space-y-0.5">
            <li v-for="item in group.items" :key="item.to">
              <RouterLink
                :to="item.to"
                class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="
                  route.path === item.to
                    ? 'bg-[#0F766E] text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                "
              >
                <component :is="item.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="truncate">{{ item.label }}</span>
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- About Group -->
        <div>
          <div class="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            About
          </div>
          <ul class="space-y-0.5">
            <li>
              <RouterLink
                to="/about"
                class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                :class="
                  route.path === '/about'
                    ? 'bg-[#0F766E] text-white'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                "
              >
                <Info class="h-4 w-4 shrink-0" aria-hidden="true" />
                <span class="truncate">關於專案</span>
              </RouterLink>
            </li>
            <li>
              <a
                v-if="systemStore.githubRepositoryUrl"
                :href="systemStore.githubRepositoryUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
              >
                <span class="flex items-center gap-2.5 truncate">
                  <Github class="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span class="truncate">GitHub Repository</span>
                </span>
                <ExternalLink class="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
              <button
                v-else
                type="button"
                disabled
                title="尚未於環境變數設定 VITE_GITHUB_REPOSITORY_URL"
                class="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium text-slate-500 cursor-not-allowed"
              >
                <span class="flex items-center gap-2.5 truncate">
                  <Github class="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span class="truncate">GitHub Repository</span>
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">未設定</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Sidebar Footer -->
      <div class="px-5 py-3.5 border-t border-slate-800/80 text-xs text-slate-400 shrink-0">
        <div class="font-medium text-slate-200">SafeAgent v{{ systemStore.frontendVersion }}</div>
        <div class="text-[11px] text-slate-400 mt-0.5">Research Prototype</div>
      </div>
    </aside>

    <!-- Main Right Column -->
    <div class="flex-1 pl-60 flex flex-col min-w-0 min-h-screen">
      <!-- Top Header -->
      <header
        class="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shrink-0"
      >
        <div class="min-w-0">
          <nav class="flex items-center gap-1.5 text-xs text-[#64748B]" aria-label="麵包屑導覽">
            <span>SafeAgent</span>
            <ChevronRight class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{{ currentGroupTitle }}</span>
            <ChevronRight class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span class="text-[#1E293B] font-medium">{{ currentPageTitle }}</span>
          </nav>
          <h1 class="text-base font-semibold text-[#1E293B] leading-tight mt-0.5 truncate">
            {{ currentPageTitle }}
          </h1>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <div class="flex items-center gap-2" data-testid="backend-status-badge">
            <span class="text-xs text-[#64748B] flex items-center gap-1">
              <Activity class="h-3.5 w-3.5" aria-hidden="true" />
              <span>後端狀態：</span>
            </span>
            <StatusBadge :label="systemStore.backendStatusLabel" :tone="backendBadgeTone" />
          </div>

          <div class="h-4 w-px bg-[#E2E8F0]" aria-hidden="true" />

          <div class="flex items-center gap-2" data-testid="agent-status-badge">
            <span class="text-xs text-[#64748B] flex items-center gap-1">
              <Bot class="h-3.5 w-3.5" aria-hidden="true" />
              <span>AI Agent：</span>
            </span>
            <StatusBadge :label="systemStore.agentStatusLabel" :tone="agentBadgeTone" />
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#1E293B] bg-white border border-[#E2E8F0] rounded-md hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            :disabled="systemStore.backendStatus === 'checking'"
            aria-label="重新檢查系統連線狀態"
            @click="handleRefreshStatus"
          >
            <RefreshCw
              class="h-3.5 w-3.5 text-[#64748B]"
              :class="{ 'animate-spin': systemStore.backendStatus === 'checking' }"
              aria-hidden="true"
            />
            <span>重試連線</span>
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 p-6 min-w-0">
        <RouterView />
      </main>

      <!-- Footer -->
      <footer class="bg-white border-t border-[#E2E8F0] px-6 py-4 text-xs text-[#64748B] shrink-0">
        <div class="flex items-center justify-between gap-4">
          <div class="font-medium text-[#1E293B]">
            SafeAgent — AI Industrial Safety &amp; Risk Assessment Agent
          </div>
          <div>
            本系統為自主學習與研究概念驗證用途，非正式職業安全衛生評估工具。
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
