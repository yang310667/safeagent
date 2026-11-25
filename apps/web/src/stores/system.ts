import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { ConfigResponse, HealthResponse } from '@safeagent/shared';
import { fetchConfig } from '@/services/config.service';
import { fetchHealth } from '@/services/health.service';
import { ApiClientError } from '@/services/api-client';

export type BackendConnectionStatus = 'checking' | 'connected' | 'disconnected';

export const useSystemStore = defineStore('system', () => {
  const backendStatus = ref<BackendConnectionStatus>('checking');
  const health = ref<HealthResponse | null>(null);
  const config = ref<ConfigResponse | null>(null);
  const lastCheckedAt = ref<string | null>(null);
  const errorMessage = ref<string | null>(null);
  const initialized = ref(false);

  const frontendVersion = computed<string>(() => {
    const ver = import.meta.env.VITE_APP_VERSION;
    return typeof ver === 'string' && ver.trim().length > 0 ? ver.trim() : '0.1.0';
  });

  const githubRepositoryUrl = computed<string>(() => {
    const url = import.meta.env.VITE_GITHUB_REPOSITORY_URL;
    return typeof url === 'string' && url.trim().length > 0 ? url.trim() : '';
  });

  const backendStatusLabel = computed<string>(() => {
    if (backendStatus.value === 'checking') return '連線檢查中';
    if (backendStatus.value === 'connected') return '後端已連線';
    return '後端未連線';
  });

  const agentStatusLabel = computed<string>(() => {
    if (backendStatus.value === 'checking') return '檢查中';
    if (backendStatus.value === 'disconnected' || !config.value) return '尚未啟用（後端未連線）';
    return config.value.agentEnabled ? '已啟用' : '尚未啟用';
  });

  const knowledgeBaseStatusLabel = computed<string>(() => {
    if (config.value?.knowledgeBaseEnabled) return '已啟用';
    return '尚未啟用';
  });

  async function checkSystemStatus(signal?: AbortSignal): Promise<void> {
    backendStatus.value = 'checking';
    errorMessage.value = null;

    try {
      const [healthResult, configResult] = await Promise.all([
        fetchHealth(undefined, signal),
        fetchConfig(undefined, signal),
      ]);
      health.value = healthResult;
      config.value = configResult;
      backendStatus.value = 'connected';
      lastCheckedAt.value = healthResult.timestamp || new Date().toISOString();
    } catch (err) {
      health.value = null;
      config.value = null;
      backendStatus.value = 'disconnected';
      lastCheckedAt.value = new Date().toISOString();
      errorMessage.value =
        err instanceof ApiClientError ? err.message : '後端未連線';
    } finally {
      initialized.value = true;
    }
  }

  return {
    backendStatus,
    health,
    config,
    lastCheckedAt,
    errorMessage,
    initialized,
    frontendVersion,
    githubRepositoryUrl,
    backendStatusLabel,
    agentStatusLabel,
    knowledgeBaseStatusLabel,
    checkSystemStatus,
  };
});
