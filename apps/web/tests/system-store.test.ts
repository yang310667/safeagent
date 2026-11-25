import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSystemStore } from '@/stores/system';

describe('useSystemStore Backend Connection Status', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets connected status when /api/health and /api/config succeed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL) => {
        const url = String(input);
        if (url.endsWith('/api/health')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                status: 'ok',
                service: 'safeagent-worker',
                version: '0.1.0',
                timestamp: '2026-11-25T14:00:00.000Z',
              }),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              agentEnabled: false,
              demoEnabled: false,
              knowledgeBaseEnabled: false,
              version: '0.1.0',
            }),
            { status: 200 },
          ),
        );
      }),
    );

    const store = useSystemStore();
    await store.checkSystemStatus();

    expect(store.backendStatus).toBe('connected');
    expect(store.backendStatusLabel).toBe('後端已連線');
    expect(store.agentStatusLabel).toBe('尚未啟用');
    expect(store.knowledgeBaseStatusLabel).toBe('尚未啟用');
  });

  it('gracefully sets disconnected status when backend is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network failure')));

    const store = useSystemStore();
    await store.checkSystemStatus();

    expect(store.backendStatus).toBe('disconnected');
    expect(store.backendStatusLabel).toBe('後端未連線');
    expect(store.agentStatusLabel).toBe('尚未啟用（後端未連線）');
    expect(store.initialized).toBe(true);
  });
});
