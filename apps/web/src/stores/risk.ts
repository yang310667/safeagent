import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { IdentifiedHazardItem, RiskAssessmentRecord } from '@safeagent/shared';

const RISK_RECORDS_STORAGE_KEY = 'safeagent.riskRecords.v1';

function loadSavedRecords(): RiskAssessmentRecord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RISK_RECORDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RiskAssessmentRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(items: RiskAssessmentRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(RISK_RECORDS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota or private mode failures
  }
}

export interface WorkspaceRiskDraft {
  scenarioTitle: string;
  scenarioSummary: string;
  hazards: IdentifiedHazardItem[];
}

export const useRiskStore = defineStore('risk', () => {
  const records = ref<RiskAssessmentRecord[]>(loadSavedRecords());
  const workspaceDraft = ref<WorkspaceRiskDraft | null>(null);
  const workspacePromptDraft = ref<string | null>(null);

  function addRecord(record: RiskAssessmentRecord): void {
    records.value = [record, ...records.value];
    saveRecords(records.value);
  }

  function renameRecord(id: string, recordName: string): void {
    const trimmed = recordName.trim();
    records.value = records.value.map((item) => {
      if (item.id !== id) return item;
      if (!trimmed) {
        const copy = { ...item };
        delete copy.recordName;
        return copy;
      }
      return { ...item, recordName: trimmed };
    });
    saveRecords(records.value);
  }

  function removeRecord(id: string): void {
    records.value = records.value.filter((item) => item.id !== id);
    saveRecords(records.value);
  }

  function clearRecords(): void {
    records.value = [];
    saveRecords(records.value);
  }

  function setWorkspaceDraft(draft: WorkspaceRiskDraft | null): void {
    workspaceDraft.value = draft;
  }

  function setWorkspacePromptDraft(prompt: string | null): void {
    workspacePromptDraft.value = prompt;
  }

  return {
    records,
    workspaceDraft,
    workspacePromptDraft,
    addRecord,
    renameRecord,
    removeRecord,
    clearRecords,
    setWorkspaceDraft,
    setWorkspacePromptDraft,
  };
});
