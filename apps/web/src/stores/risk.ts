import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { IdentifiedHazardItem, RiskAssessmentRecord } from '@safeagent/shared';

export interface WorkspaceRiskDraft {
  scenarioTitle: string;
  scenarioSummary: string;
  hazards: IdentifiedHazardItem[];
}

export const useRiskStore = defineStore('risk', () => {
  const records = ref<RiskAssessmentRecord[]>([]);
  const workspaceDraft = ref<WorkspaceRiskDraft | null>(null);
  const workspacePromptDraft = ref<string | null>(null);

  function addRecord(record: RiskAssessmentRecord): void {
    records.value = [record, ...records.value];
  }

  function removeRecord(id: string): void {
    records.value = records.value.filter((item) => item.id !== id);
  }

  function clearRecords(): void {
    records.value = [];
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
    removeRecord,
    clearRecords,
    setWorkspaceDraft,
    setWorkspacePromptDraft,
  };
});
