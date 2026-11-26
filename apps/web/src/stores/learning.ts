import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { LearningLogEntry, LearningPlanResponse } from '@safeagent/shared';

const LOGS_STORAGE_KEY = 'safeagent.learningLogs.v1';
const PLAN_STORAGE_KEY = 'safeagent.learningPlan.v1';
const CHECKS_STORAGE_KEY = 'safeagent.learningPlanChecks.v1';

function loadJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

export const useLearningStore = defineStore('learning', () => {
  const logs = ref<LearningLogEntry[]>(loadJson<LearningLogEntry[]>(LOGS_STORAGE_KEY, []));
  const latestPlan = ref<LearningPlanResponse | null>(
    loadJson<LearningPlanResponse | null>(PLAN_STORAGE_KEY, null),
  );
  const completedWeekLabels = ref<string[]>(loadJson<string[]>(CHECKS_STORAGE_KEY, []));

  function addLog(entry: LearningLogEntry): void {
    logs.value = [entry, ...logs.value];
    saveJson(LOGS_STORAGE_KEY, logs.value);
  }

  function removeLog(id: string): void {
    logs.value = logs.value.filter((item) => item.id !== id);
    saveJson(LOGS_STORAGE_KEY, logs.value);
  }

  function setLatestPlan(plan: LearningPlanResponse | null): void {
    latestPlan.value = plan;
    completedWeekLabels.value = [];
    saveJson(PLAN_STORAGE_KEY, plan);
    saveJson(CHECKS_STORAGE_KEY, []);
  }

  function toggleWeekDone(weekLabel: string): void {
    if (completedWeekLabels.value.includes(weekLabel)) {
      completedWeekLabels.value = completedWeekLabels.value.filter((w) => w !== weekLabel);
    } else {
      completedWeekLabels.value = [...completedWeekLabels.value, weekLabel];
    }
    saveJson(CHECKS_STORAGE_KEY, completedWeekLabels.value);
  }

  return {
    logs,
    latestPlan,
    completedWeekLabels,
    addLog,
    removeLog,
    setLatestPlan,
    toggleWeekDone,
  };
});
