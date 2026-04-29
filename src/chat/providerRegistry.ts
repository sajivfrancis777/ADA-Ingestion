/**
 * providerRegistry.ts — Maps ProviderType → LLMProvider implementation.
 *
 * Adding a new provider:
 *  1. Create <name>Provider.ts exporting an LLMProvider object
 *  2. Import it here and add to PROVIDERS
 *  3. Add a ProviderMeta entry in types.ts → PROVIDER_META
 *  4. (Optional) Add UI hints in ProviderConfigPanel
 */
import type { LLMProvider, ProviderType, ChatMessagePayload, ProviderConfig, LLMResponse } from './types';
import { ollamaProvider } from './ollamaProvider';
import { anthropicProvider } from './anthropicProvider';

// ── Generic / Custom provider (passthrough to endpoint) ─────────

const customProvider: LLMProvider = {
  type: 'custom',
  formatPayload(messages: ChatMessagePayload[], config: ProviderConfig) {
    return {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      model: config.model,
      max_tokens: config.maxTokens,
    };
  },
  async send(messages, config): Promise<LLMResponse> {
    if (!config.baseUrl) throw new Error('Custom provider: no endpoint URL configured.');
    const payload = this.formatPayload(messages, config);
    const start = performance.now();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const res = await fetch(config.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Custom endpoint error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.content ?? data.choices?.[0]?.message?.content ?? 'No response',
      provider: 'custom',
      model: config.model,
      durationMs: Math.round(performance.now() - start),
    };
  },
};

// ── OpenAI provider (reuses the existing sendMessage logic shape) ─

const openaiProvider: LLMProvider = {
  type: 'openai',
  formatPayload(messages: ChatMessagePayload[], config: ProviderConfig) {
    return {
      model: config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };
  },
  async send(messages, config): Promise<LLMResponse> {
    const url = config.baseUrl || 'https://api.openai.com/v1/chat/completions';
    const payload = this.formatPayload(messages, config);
    const start = performance.now();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey ?? ''}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? 'No response',
      provider: 'openai',
      model: config.model,
      durationMs: Math.round(performance.now() - start),
    };
  },
};

// ── Azure OpenAI (Responses API — /openai/responses) ────────────

const azureOpenaiProvider: LLMProvider = {
  type: 'azure-openai',
  formatPayload(messages: ChatMessagePayload[], config: ProviderConfig) {
    return {
      model: config.model,
      input: messages.map(m => ({ role: m.role, content: m.content })),
      max_output_tokens: Math.max(16, config.maxTokens ?? 1024),
      ...(config.temperature != null ? { temperature: config.temperature } : {}),
    };
  },
  async send(messages, config): Promise<LLMResponse> {
    if (!config.baseUrl) throw new Error('Azure OpenAI: no endpoint URL configured. Use format: https://{resource}.cognitiveservices.azure.com/openai/responses?api-version=2025-04-01-preview');
    const payload = this.formatPayload(messages, config);
    const start = performance.now();
    const res = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': config.apiKey ?? '',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Azure OpenAI error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // Responses API: output[].content[].text
    const text = data.output
      ?.filter((item: any) => item.type === 'message')
      ?.flatMap((item: any) => item.content ?? [])
      ?.filter((part: any) => part.type === 'output_text')
      ?.map((part: any) => part.text)
      ?.join('') ?? 'No response';
    return {
      content: text,
      provider: 'azure-openai',
      model: config.model,
      durationMs: Math.round(performance.now() - start),
    };
  },
};

// ── Registry ────────────────────────────────────────────────────

const PROVIDERS: Record<ProviderType, LLMProvider> = {
  ollama: ollamaProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
  'azure-openai': azureOpenaiProvider,
  custom: customProvider,
};

export function getProvider(type: ProviderType): LLMProvider {
  const p = PROVIDERS[type];
  if (!p) throw new Error(`Unknown provider: ${type}`);
  return p;
}

export { PROVIDERS };
