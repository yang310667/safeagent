import type { ApiErrorResponse, ConfigResponse, HealthResponse } from '@safeagent/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index';

const defaultEnv = {
  APP_VERSION: '0.1.0',
  AGENT_ENABLED: 'false',
  ALLOWED_ORIGINS: 'http://localhost:5173,https://example.github.io',
  OPENAI_API_KEY: 'sk-test-secret-should-never-appear',
};

describe('SafeAgent Worker API', () => {
  const app = createApp();

  it('GET /api/health returns service status and ISO-8601 timestamp', async () => {
    const res = await app.request('/api/health', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-Id')).toBeTruthy();

    const data = (await res.json()) as HealthResponse;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('safeagent-worker');
    expect(data.version).toBe('0.1.0');
    expect(Number.isNaN(Date.parse(data.timestamp))).toBe(false);
  });

  it('GET /api/config returns public feature flags without exposing secrets', async () => {
    const res = await app.request('/api/config', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(200);

    const rawText = await res.text();
    expect(rawText).not.toContain('sk-test-secret');
    expect(rawText).not.toContain('OPENAI_API_KEY');

    const data = JSON.parse(rawText) as ConfigResponse;
    expect(data).toEqual({
      agentEnabled: false,
      demoEnabled: false,
      knowledgeBaseEnabled: false,
      version: '0.1.0',
    });
  });

  it('POST /api/agent/chat returns HTTP 501 AGENT_NOT_IMPLEMENTED in Day 1', async () => {
    const res = await app.request(
      '/api/agent/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '請協助分析排氣風車維修作業的潛在危害',
          conversationId: null,
        }),
      },
      defaultEnv,
    );

    expect(res.status).toBe(501);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error).toEqual({
      code: 'AGENT_NOT_IMPLEMENTED',
      message: 'AI Agent 尚未啟用',
    });
    expect(data.requestId).toBeTruthy();
  });

  it('POST /api/agent/chat validates missing message with HTTP 400', async () => {
    const res = await app.request(
      '/api/agent/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', conversationId: null }),
      },
      defaultEnv,
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error.code).toBe('INVALID_REQUEST');
  });

  it('enforces CORS allowlist for allowed and disallowed origins', async () => {
    const allowedRes = await app.request(
      '/api/health',
      {
        method: 'GET',
        headers: { Origin: 'http://localhost:5173' },
      },
      defaultEnv,
    );
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');

    const githubPagesRes = await app.request(
      '/api/health',
      {
        method: 'GET',
        headers: { Origin: 'https://example.github.io' },
      },
      defaultEnv,
    );
    expect(githubPagesRes.status).toBe(200);
    expect(githubPagesRes.headers.get('Access-Control-Allow-Origin')).toBe('https://example.github.io');

    const disallowedRes = await app.request(
      '/api/health',
      {
        method: 'GET',
        headers: { Origin: 'https://evil.example.com' },
      },
      defaultEnv,
    );
    expect(disallowedRes.status).toBe(200);
    expect(disallowedRes.headers.get('Access-Control-Allow-Origin')).toBeNull();

    const preflightAllowed = await app.request(
      '/api/agent/chat',
      {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      },
      defaultEnv,
    );
    expect(preflightAllowed.status).toBe(204);
    expect(preflightAllowed.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');

    const preflightDisallowed = await app.request(
      '/api/agent/chat',
      {
        method: 'OPTIONS',
        headers: { Origin: 'https://evil.example.com' },
      },
      defaultEnv,
    );
    expect(preflightDisallowed.status).toBe(403);
    expect(preflightDisallowed.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('returns unified 404 JSON for unknown routes', async () => {
    const res = await app.request('/api/unknown-route', { method: 'GET' }, defaultEnv);
    expect(res.status).toBe(404);
    const data = (await res.json()) as ApiErrorResponse;
    expect(data.error.code).toBe('NOT_FOUND');
    expect(data.requestId).toBeTruthy();
  });
});
