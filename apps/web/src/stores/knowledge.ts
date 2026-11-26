import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { KnowledgeArticle } from '@safeagent/shared';

const STORAGE_KEY = 'safeagent.customKnowledge.v1';

function loadStoredArticles(): KnowledgeArticle[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as KnowledgeArticle[]) : [];
  } catch {
    return [];
  }
}

function saveStoredArticles(items: KnowledgeArticle[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

export const useKnowledgeStore = defineStore('knowledge', () => {
  const customArticles = ref<KnowledgeArticle[]>(loadStoredArticles());

  function addCustomArticle(article: KnowledgeArticle): void {
    const filtered = customArticles.value.filter((item) => item.id !== article.id);
    customArticles.value = [article, ...filtered];
    saveStoredArticles(customArticles.value);
  }

  function removeCustomArticle(id: string): void {
    customArticles.value = customArticles.value.filter((item) => item.id !== id);
    saveStoredArticles(customArticles.value);
  }

  function clearCustomArticles(): void {
    customArticles.value = [];
    saveStoredArticles([]);
  }

  function isCustomArticle(id: string): boolean {
    return customArticles.value.some((item) => item.id === id);
  }

  return {
    customArticles,
    addCustomArticle,
    removeCustomArticle,
    clearCustomArticles,
    isCustomArticle,
  };
});
