import type { SseEventPayload, SseEventType } from '@safeagent/shared';

/**
 * Formats an SSE event frame for future streaming agent responses (Day 5).
 */
export function formatSseEvent<T>(event: SseEventType, data: T): string {
  const payload: SseEventPayload<T> = {
    event,
    data,
    timestamp: new Date().toISOString(),
  };
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export function createSseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
}
