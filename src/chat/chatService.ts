/**
 * chatService.ts — LLM API abstraction layer.
 *
 * Configurable backend: supports direct API, Azure Functions proxy,
 * or Cloudflare Worker. Admin manages keys from the UI.
 *
 * Stores API config in localStorage (encrypted in production via Azure Key Vault).
 */

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  artifacts?: ChatArtifact[];
}

export interface ChatArtifact {
  type: 'mermaid' | 'table' | 'code' | 'link';
  title: string;
  content: string;
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'azure-openai' | 'custom';
  apiKey: string;
  model: string;
  endpoint?: string;  // Custom endpoint (Azure Functions, Cloudflare Worker)
  maxTokens: number;
  temperature: number;
}

const CONFIG_KEY = 'iao_llm_config';
const HISTORY_KEY = 'iao_chat_history';

const DEFAULT_CONFIG: LLMConfig = {
  provider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  endpoint: '',
  maxTokens: 4096,
  temperature: 0.3,
};

// System prompt grounding the assistant in IAO architecture context
const SYSTEM_PROMPT = `You are the IAO Architecture Assistant for Intel's IDM 2.0 program.
You help architects with:
- SAP S/4HANA transformation architecture (8 towers: FPR, OTC-IF, OTC-IP, FTS-IF, FTS-IP, PTP, MDM, E2E)
- Application, Data, and Technology architecture questions
- TOGAF BDAT framework and ArchiMate modeling
- Integration patterns (IDoc, RFC, REST, OData, MuleSoft, Kafka)
- System landscape navigation (SAP, Snowflake, MuleSoft, BODS, AutoSys)

Keep answers concise, technical, and actionable. Reference specific systems and capabilities when relevant.
When generating diagrams, use Mermaid syntax compatible with the published SAD format.`;

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function saveLLMConfig(config: LLMConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function loadChatHistory(): ChatMessage[][] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveChatHistory(sessions: ChatMessage[][]) {
  // Keep last 50 sessions
  const trimmed = sessions.slice(-50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

let messageCounter = 0;
function makeId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

/**
 * Send a message to the configured LLM and get a response.
 * @param gridContext — optional stringified grid data for context-aware answers
 */
export async function sendMessage(
  messages: ChatMessage[],
  config: LLMConfig,
  gridContext?: string,
): Promise<ChatMessage> {
  if (!config.apiKey && !config.endpoint) {
    return {
      id: makeId(),
      role: 'assistant',
      content: '⚙️ **No LLM API configured.** Click your profile icon (bottom-right) → "🔑 AI Assistant — API Key" to enter your API key.\n\nYou can use Anthropic (Claude), OpenAI (GPT), or Azure OpenAI.',
      timestamp: Date.now(),
    };
  }

  // Build system prompt with optional grid context
  let systemPrompt = SYSTEM_PROMPT;
  if (gridContext) {
    systemPrompt += `\n\n## Current Architecture Data (from the editor grid)\n${gridContext}`;
  }

  const apiMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  try {
    // If custom endpoint (Azure Functions / Cloudflare Worker), use it
    if (config.endpoint) {
      const res = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model: config.model, max_tokens: config.maxTokens }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return {
        id: makeId(),
        role: 'assistant',
        content: data.content ?? data.choices?.[0]?.message?.content ?? 'No response',
        timestamp: Date.now(),
      };
    }

    // Direct Anthropic API (requires CORS proxy in production)
    if (config.provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error ${res.status}: ${err}`);
      }
      const data = await res.json();
      return {
        id: makeId(),
        role: 'assistant',
        content: data.content?.[0]?.text ?? 'No response',
        timestamp: Date.now(),
      };
    }

    // OpenAI / Azure OpenAI
    const endpoint = config.provider === 'azure-openai' && config.endpoint
      ? config.endpoint
      : 'https://api.openai.com/v1/chat/completions';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: apiMessages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      }),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    return {
      id: makeId(),
      role: 'assistant',
      content: data.choices?.[0]?.message?.content ?? 'No response',
      timestamp: Date.now(),
    };
  } catch (e) {
    return {
      id: makeId(),
      role: 'assistant',
      content: `❌ **Error:** ${e instanceof Error ? e.message : 'Unknown error'}\n\nCheck your API configuration in Admin → API Keys.`,
      timestamp: Date.now(),
    };
  }
}

export function createUserMessage(content: string): ChatMessage {
  return { id: makeId(), role: 'user', content, timestamp: Date.now() };
}
