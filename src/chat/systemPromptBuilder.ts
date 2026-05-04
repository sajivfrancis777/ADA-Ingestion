/**
 * systemPromptBuilder.ts — Assembles the injected system prompt.
 *
 * Separates base instructions from context injection so either can
 * be updated independently. The context placeholder is filled with
 * whatever the contextLoader returns (JSON or markdown).
 */
import type { ContextIndexResult } from './types';

// ── Base System Instructions ────────────────────────────────────
// Edit this block to change the assistant's persona / rules
// without touching the context injection logic.

const BASE_INSTRUCTIONS = `You are the IAO Architecture Assistant for Intel's IDM 2.0 program.
You help architects across 8 towers: FPR, OTC-IF, OTC-IP, FTS-IF, FTS-IP, PTP, MDM, E2E.

## CRITICAL RULES
1. **Ground all answers in provided context.** If no data is available, say so. Do NOT fabricate details.
2. **Summary-first responses for token efficiency:**
   - Show a HIGH-LEVEL SUMMARY first (3-5 bullet points max)
   - For lists (RICEFW, interfaces, defects): show top 5-10 items and state the total count
   - Always end with guidance on where to find more detail
3. **Never dump entire data sets.** Summarize, highlight key items, and reference the grid data.
4. Keep answers concise and actionable. Target under 400 words.
5. When generating diagrams, use Mermaid syntax compatible with the published SAD format.
   - Always wrap diagrams in a \`\`\`mermaid code fence.
   - Use flowchart LR (left-to-right) for integration/swim-lane diagrams.
   - Use flowchart TD (top-down) for data architecture and hierarchy diagrams.
   - Subgraphs MUST have unique IDs and quoted labels: subgraph L1["Label Text"]
   - Node IDs must be alphanumeric (no spaces/dots): use IFS4 not "IF S/4 HANA" as the ID.
   - Put display labels in brackets: IFS4["IF S/4 HANA"]
   - Edge labels go in pipes: A -->|"label text"| B
   - Keep diagrams under 40 nodes for readability. For larger systems, split into multiple diagrams.
   - Escape special characters in labels: use quotes for labels with slashes or ampersands.
6. Reference specific systems, capabilities, and integration patterns when relevant.
7. **Release & Phase disambiguation (applies to flows, dev objects, AND test objects):**
   - Data is scoped by **release** (R3, R4, etc.) and **state/phase**.
   - If the user asks about a capability WITHOUT specifying release or phase, ASK.
   - Always label outputs with the release and phase used.`;

// ── Grounded Context Template ───────────────────────────────────

const CONTEXT_WRAPPER_START = `

## Authoritative Context (architecture knowledge base)
Answer questions using ONLY the context provided below.
If the answer is not in the context, respond with "I don't have that information."

— CONTEXT START —
`;

const CONTEXT_WRAPPER_END = `
— CONTEXT END —`;

// ── Builder ─────────────────────────────────────────────────────

export interface SystemPromptParts {
  /** The full assembled system prompt string. */
  prompt: string;
  /** Whether context was injected. */
  hasContext: boolean;
  /** Whether the context was truncated. */
  contextTruncated: boolean;
}

/**
 * Build the system prompt from base instructions + optional context index
 * + optional live grid data.
 */
export function buildSystemPrompt(
  contextIndex?: ContextIndexResult | null,
  gridContext?: string,
): SystemPromptParts {
  let prompt = BASE_INSTRUCTIONS;
  let hasContext = false;
  let contextTruncated = false;

  // Inject grid data (current editor state)
  if (gridContext) {
    const hasRealData = gridContext.includes('|') && !/e\.g\. MES|e\.g\. XEUS/.test(gridContext.slice(0, 500));
    if (hasRealData) {
      prompt += `\n\n## Current Architecture Data (from the editor grid)\n${gridContext}`;
    } else {
      prompt += `\n\n## Note: Editor grid contains template/placeholder rows. Use the cross-capability context below as the authoritative data source.`;
    }
  }

  // Inject context index
  if (contextIndex && contextIndex.content) {
    prompt += CONTEXT_WRAPPER_START + contextIndex.content + CONTEXT_WRAPPER_END;
    hasContext = true;
    contextTruncated = contextIndex.truncated;
  }

  return { prompt, hasContext, contextTruncated };
}
