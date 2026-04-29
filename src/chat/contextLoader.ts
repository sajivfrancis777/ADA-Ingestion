/**
 * contextLoader.ts — Loads the context index from ADA-Artifacts and
 * prepares it for injection into the system prompt.
 *
 * Supports two modes:
 *  - ADA-Artifacts GitHub Pages URL (dev / default)
 *  - Custom URL (for self-hosted or CDN deployments)
 *
 * Detects format (JSON or markdown/text) and estimates token count.
 * Validates against the selected provider's context limit and truncates
 * with a warning if necessary.
 */
import type { ContextIndexResult, ProviderType } from './types';
import { PROVIDER_META } from './types';

// ── Default source URL ──────────────────────────────────────────

const DEFAULT_CONTEXT_URL =
  import.meta.env.VITE_CONTEXT_INDEX_URL ??
  'https://sajivfrancis777.github.io/ADA-Artifacts/context-index.json';

// ── Token estimation ────────────────────────────────────────────

/** Rough token estimate: ~4 chars per token for English/mixed technical text. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Context budget per provider ─────────────────────────────────

/** Tokens reserved for the base system prompt + conversation history. */
const RESERVED_TOKENS = 3000;

function getContextBudget(provider: ProviderType): number {
  const meta = PROVIDER_META[provider];
  return (meta?.contextLimit ?? 8192) - RESERVED_TOKENS;
}

// ── Format detection ────────────────────────────────────────────

function detectFormat(text: string, contentType: string): 'json' | 'markdown' | 'text' {
  if (contentType.includes('application/json') || text.trimStart().startsWith('{')) return 'json';
  if (text.includes('# ') || text.includes('## ') || text.includes('```')) return 'markdown';
  return 'text';
}

// ── Loader ──────────────────────────────────────────────────────

export type ContextLoadStatus = 'idle' | 'loading' | 'loaded' | 'failed' | 'truncated';

let cachedResult: ContextIndexResult | null = null;
let cachedSource: string | null = null;

/**
 * Load the context index from the given (or default) URL.
 * Caches the result for the lifetime of the page.
 *
 * @param provider   The active provider type — used for context-limit validation.
 * @param sourceUrl  Override the default ADA-Artifacts URL.
 * @returns          A typed ContextIndexResult, or null on failure.
 */
export async function loadContextIndex(
  provider: ProviderType = 'anthropic',
  sourceUrl?: string,
): Promise<ContextIndexResult | null> {
  const url = sourceUrl ?? DEFAULT_CONTEXT_URL;

  // Return cache if same source
  if (cachedResult && cachedSource === url) {
    // Re-validate truncation against current provider's limit
    return applyTruncation(cachedResult, provider);
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const contentType = res.headers.get('content-type') ?? '';
    const rawText = await res.text();
    const format = detectFormat(rawText, contentType);

    // For JSON, stringify with 2-space indent for readable context injection.
    // For markdown/text, use as-is.
    let content: string;
    if (format === 'json') {
      try {
        const parsed = JSON.parse(rawText);
        content = JSON.stringify(parsed, null, 2);
      } catch {
        content = rawText;
      }
    } else {
      content = rawText;
    }

    const tokenEstimate = estimateTokens(content);
    const result: ContextIndexResult = {
      content,
      format,
      tokenEstimate,
      truncated: false,
      source: url,
    };

    cachedResult = result;
    cachedSource = url;

    return applyTruncation(result, provider);
  } catch (e) {
    console.warn('[contextLoader] Failed to load context index:', e);
    return null;
  }
}

/** Truncate content if it exceeds the provider's context budget. */
function applyTruncation(result: ContextIndexResult, provider: ProviderType): ContextIndexResult {
  const budget = getContextBudget(provider);
  if (result.tokenEstimate <= budget) {
    return { ...result, truncated: false };
  }
  // Truncate to budget (chars ≈ tokens × 4)
  const maxChars = budget * 4;
  return {
    ...result,
    content: result.content.slice(0, maxChars) + '\n\n…(context truncated to fit provider limit)',
    tokenEstimate: budget,
    truncated: true,
  };
}

/** Invalidate the cache (e.g., when user changes the source URL). */
export function invalidateContextCache() {
  cachedResult = null;
  cachedSource = null;
}
