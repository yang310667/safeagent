import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiClientError } from '@/services/api-client';
import { fetchHealth } from '@/services/health.service';
import { fetchConfig } from '@/services/config.service';
import { sendAgentChat } from '@/services/agent.service';

describe('Frontend ApiClient & Services', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('calls /api/health with unified base URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          service: 'safeagent-worker',
          version: '0.1.0',
          timestamp: '2026-11-25T14:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new ApiClient('http://localhost:8787/');
    const res = await fetchHealth(client);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/health',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(res.status).toBe('ok');
  });

  it('parses structured API error responses (e.g. HTTP 501 from /api/agent/chat)', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'AGENT_NOT_IMPLEMENTED',
            message: 'AI Agent 尚未啟用',
          },
          requestId: 'req-123',
        }),
        { status: 501, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', mockFetch);

    const client = new ApiClient('http://localhost:8787');
    await expect(
      sendAgentChat({ message: '測試作業情境', conversationId: null }, client),
    ).rejects.toMatchObject({
      status: 501,
      code: 'AGENT_NOT_IMPLEMENTED',
      message: 'AI Agent 尚未啟用',
      requestId: 'req-123',
    });
  });

  it('handles network error cleanly when backend is offline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const client = new ApiClient('http://localhost:8787');
    await expect(fetchConfig(client)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      isNetworkError: true,
    });
  });

  it('supports request timeout via AbortController', async () => {
    vi.useFakeTimers();

    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted', 'AbortError'));
          });
        });
      }),
    );

    const client = new ApiClient('http://localhost:8787', 100);
    const promise = client.request('/api/health');

    vi.advanceTimersByTime(150);

    await expect(promise).rejects.toBeInstanceOf(ApiClientError);
    await expect(promise).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      isTimeout: true,
    });
  });

  it('supports external AbortSignal cancellation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    );

    const controller = new AbortController();
    const client = new ApiClient('http://localhost:8787', 5000);
    const promise = client.request('/api/health', { signal: controller.signal });

    controller.abort();

    await expect(promise).rejects.toMatchObject({
      code: 'REQUEST_ABORTED',
      isTimeout: false,
    });
  });
});
