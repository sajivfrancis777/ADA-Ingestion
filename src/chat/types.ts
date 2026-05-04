/**
 * types.ts — Shared type definitions for the multi-provider chat system.
 *
 * Extends the existing LLMConfig / ChatMessage types from chatService.ts.
 * Import these for new provider modules; the legacy types remain in
 * chatService.ts for backward compatibility until fully migrated.
 */

// ── Provider Types ──────────────────────────────────────────────

export type ProviderType = 'ollama' | 'anthropic' | 'openai' | 'azure-openai' | 'custom';

export interface ProviderConfig {
  type: ProviderType;
  baseUrl: string;
  model: string;
  /** Never stored in React state — read from env/worker only. */
  apiKey?: string;
  maxTokens: number;
  temperature: number;
}

/** Static metadata for a provider option in the UI. */
export interface ProviderMeta {
  type: ProviderType;
  label: string;
  defaultBaseUrl: string;
  defaultModel: string;
  models: string[];
  /** Approximate context window size in tokens. */
  contextLimit: number;
  /** Whether the provider requires an API key in the config. */
  requiresApiKey: boolean;
  /** Whether requests are proxied through a worker (key never leaves server). */
  proxied: boolean;
}

// ── Message Types ───────────────────────────────────────────────

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ── Context Index Types ─────────────────────────────────────────

export interface ContextIndexResult {
  content: string;
  format: 'json' | 'markdown' | 'text';
  tokenEstimate: number;
  truncated: boolean;
  source: string;
}

// ── LLM Response ────────────────────────────────────────────────

export interface LLMResponse {
  content: string;
  provider: ProviderType;
  model: string;
  durationMs?: number;
}

// ── Provider Interface ──────────────────────────────────────────

/**
 * Every provider module exports an object conforming to this interface.
 * The chat service dispatches to the correct provider at runtime.
 */
export interface LLMProvider {
  readonly type: ProviderType;
  /** Format the shared message array into the provider's API payload. */
  formatPayload(
    messages: ChatMessagePayload[],
    config: ProviderConfig,
  ): unknown;
  /** Send the formatted payload and return a normalised response. */
  send(
    messages: ChatMessagePayload[],
    config: ProviderConfig,
  ): Promise<LLMResponse>;
}

// ── Provider Registry ───────────────────────────────────────────

export const PROVIDER_META: Record<ProviderType, ProviderMeta> = {
  ollama: {
    type: 'ollama',
    label: 'Ollama (Local)',
    defaultBaseUrl: 'http://localhost:11434/api/chat',
    defaultModel: 'mistral',
    models: ['mistral', 'phi3:mini', 'llama3.2:3b'],
    contextLimit: 8192,
    requiresApiKey: false,
    proxied: false,
  },
  anthropic: {
    type: 'anthropic',
    label: 'Anthropic (via Worker)',
    defaultBaseUrl: '',  // set via VITE_ANTHROPIC_WORKER_URL
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
    contextLimit: 200_000,
    requiresApiKey: false,  // key lives on the worker
    proxied: true,
  },
  openai: {
    type: 'openai',
    label: 'OpenAI (GPT)',
    defaultBaseUrl: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini'],
    contextLimit: 128_000,
    requiresApiKey: true,
    proxied: false,
  },
  'azure-openai': {
    type: 'azure-openai',
    label: 'Azure OpenAI',
    defaultBaseUrl: '',
    defaultModel: 'gpt-5.4-mini',
    models: ['gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.4-pro'],
    contextLimit: 128_000,
    requiresApiKey: true,
    proxied: false,
  },
  custom: {
    type: 'custom',
    label: 'Custom Endpoint',
    defaultBaseUrl: '',
    defaultModel: '',
    models: [],
    contextLimit: 128_000,
    requiresApiKey: false,
    proxied: false,
  },
};
