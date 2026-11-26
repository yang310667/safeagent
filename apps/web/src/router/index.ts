import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: {
      title: '專案首頁',
      group: 'Overview',
    },
  },
  {
    path: '/guide',
    name: 'guide',
    component: () => import('@/views/GuideView.vue'),
    meta: {
      title: '使用說明與範例',
      group: 'Overview',
    },
  },
  {
    path: '/workspace',
    name: 'workspace',
    component: () => import('@/views/WorkspaceView.vue'),
    meta: {
      title: 'AI 風險評估',
      group: 'Workspace',
    },
  },
  {
    path: '/risk-matrix',
    name: 'risk-matrix',
    component: () => import('@/views/RiskMatrixView.vue'),
    meta: {
      title: '風險矩陣',
      group: 'Workspace',
    },
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('@/views/KnowledgeView.vue'),
    meta: {
      title: '職安知識庫',
      group: 'Knowledge',
    },
  },
  {
    path: '/accident-cases',
    name: 'accident-cases',
    component: () => import('@/views/AccidentCasesView.vue'),
    meta: {
      title: '職災案例',
      group: 'Knowledge',
    },
  },
  {
    path: '/learning-log',
    name: 'learning-log',
    component: () => import('@/views/LearningLogView.vue'),
    meta: {
      title: '自主學習紀錄',
      group: 'Research',
    },
  },
  {
    path: '/evaluation',
    name: 'evaluation',
    component: () => import('@/views/EvaluationView.vue'),
    meta: {
      title: 'Agent 評估與測試',
      group: 'Research',
    },
  },
  {
    path: '/future-research',
    name: 'future-research',
    component: () => import('@/views/FutureResearchView.vue'),
    meta: {
      title: '未來研究方向',
      group: 'Research',
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutView.vue'),
    meta: {
      title: '關於專案',
      group: 'About',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export function createAppRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior() {
      return { top: 0 };
    },
  });

  router.afterEach((to) => {
    const pageTitle = typeof to.meta?.title === 'string' ? to.meta.title : '';
    document.title = pageTitle
      ? `${pageTitle} | SafeAgent — AI 產業安全與風險評估助手`
      : 'SafeAgent — AI 產業安全與風險評估助手';
  });

  return router;
}

const router = createAppRouter();

export default router;
