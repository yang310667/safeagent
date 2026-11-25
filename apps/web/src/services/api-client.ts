import type { ApiErrorResponse } from '@safeagent/shared';

export class ApiClientError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly requestId?: string;
  readonly isNetworkError: boolean;
  readonly isTimeout: boolean;

  constructor(options: {
    message: string;
    code: string;
    status?: number | null;
    requestId?: string;
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiClientError';
    this.status = options.status ?? null;
    this.code = options.code;
    this.requestId = options.requestId;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isTimeout = options.isTimeout ?? false;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 5000;

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const base = typeof configured === 'string' && configured.trim().length > 0 ? configured.trim() : 'http://localhost:8787';
  return base.replace(/\/+$/, '');
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(baseUrl = getApiBaseUrl(), defaultTimeoutMs = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeoutMs = this.defaultTimeoutMs,
      signal: externalSignal,
    } = options;

    const controller = new AbortController();
    let didTimeout = false;

    const onExternalAbort = () => {
      controller.abort();
    };

    if (externalSignal) {
      if (externalSignal.aborted) {
        controller.abort();
      } else {
        externalSignal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${normalizedPath}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const responseRequestId = response.headers.get('X-Request-Id') ?? undefined;

      if (!response.ok) {
        let errorData: Partial<ApiErrorResponse> | null = null;
        try {
          errorData = (await response.json()) as Partial<ApiErrorResponse>;
        } catch {
          errorData = null;
        }

        throw new ApiClientError({
          status: response.status,
          code: errorData?.error?.code || `HTTP_${response.status}`,
          message: errorData?.error?.message || `API 請求失敗 (${response.status})`,
          requestId: errorData?.requestId || responseRequestId,
        });
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ApiClientError) {
        throw err;
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        if (didTimeout) {
          throw new ApiClientError({
            code: 'REQUEST_TIMEOUT',
            message: '後端連線逾時',
            isTimeout: true,
          });
        }
        throw new ApiClientError({
          code: 'REQUEST_ABORTED',
          message: '請求已取消',
        });
      }

      throw new ApiClientError({
        code: 'NETWORK_ERROR',
        message: '無法連線至後端服務',
        isNetworkError: true,
      });
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }
}

export const apiClient = new ApiClient();
