/**
 * anthropicProvider.ts — Anthropic Claude provider (via Cloudflare Worker proxy).
 *
 * The API key NEVER appears in browser state or network calls —
 * it lives on the Cloudflare Worker. The browser sends only the
 * model, system prompt, and messages to the worker URL.
 *
 * If no worker URL is configured, falls back to the legacy direct-API
 * path (with the browser-access header) for local development only.
 */
import type { LLMProvider, ChatMessagePayload, ProviderConfig, LLMResponse } from './types';

/** Anthropic /v1/messages payload shape. */
function formatPayload(messages: ChatMessagePayload[], config: ProviderConfig) {
  // Separate system message from conversation turns
  const systemMsg = messages.find(m => m.role === 'system');
  const turns = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  return {
    model: config.model || 'claude-sonnet-4-20250514',
    system: systemMsg?.content ?? '',
    messages: turns,
    max_tokens: config.maxTokens || 2048,
    temperature: config.temperature ?? 0.3,
  };
}

async function send(
  messages: ChatMessagePayload[],
  config: ProviderConfig,
): Promise<LLMResponse> {
  const payload = formatPayload(messages, config);
  const start = performance.now();

  // Prefer worker proxy URL (production); fall back to direct API (dev only)
  const workerUrl = config.baseUrl || import.meta.env.VITE_ANTHROPIC_WORKER_URL;
  const useDirect = !workerUrl;

  const url = useDirect
    ? 'https://api.anthropic.com/v1/messages'
    : workerUrl;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useDirect) {
    // Direct API — local dev fallback only. Key must come from legacy config.
    if (!config.apiKey) {
      throw new Error('Anthropic: no Worker URL configured and no API key available. Set VITE_ANTHROPIC_WORKER_URL or provide an API key.');
    }
    headers['x-api-key'] = config.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const durationMs = Math.round(performance.now() - start);

  return {
    content: data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? 'No response',
    provider: 'anthropic',
    model: config.model,
    durationMs,
  };
}

export const anthropicProvider: LLMProvider = {
  type: 'anthropic',
  formatPayload,
  send,
};
