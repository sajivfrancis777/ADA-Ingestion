/**
 * ollamaProvider.ts — Ollama (local) LLM provider.
 *
 * Formats messages into Ollama's /api/chat payload and normalises the response.
 * Works fully offline — localhost only, no API key required.
 */
import type { LLMProvider, ChatMessagePayload, ProviderConfig, LLMResponse } from './types';

function formatPayload(messages: ChatMessagePayload[], config: ProviderConfig) {
  return {
    model: config.model,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
    stream: false,
    options: {
      temperature: config.temperature,
      num_ctx: 8192,
      num_thread: 4,
    },
  };
}

async function send(
  messages: ChatMessagePayload[],
  config: ProviderConfig,
): Promise<LLMResponse> {
  const url = config.baseUrl || 'http://localhost:11434/api/chat';
  const payload = formatPayload(messages, config);
  const start = performance.now();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const durationMs = Math.round(performance.now() - start);

  return {
    content: data.message?.content ?? data.response ?? 'No response from Ollama',
    provider: 'ollama',
    model: config.model,
    durationMs,
  };
}

export const ollamaProvider: LLMProvider = {
  type: 'ollama',
  formatPayload,
  send,
};
