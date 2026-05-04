/**
 * Lightweight markdown-to-HTML renderer for chat messages.
 * Escapes HTML first (security), then applies markdown transforms.
 * Supports: code blocks, inline code, bold, italic, headers, lists,
 * tables, blockquotes, horizontal rules, and links (https only).
 */

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

export function renderMarkdown(raw: string): string {
  const blocks: string[] = [];
  let t = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang: string, code: string) => {
    const trimmed = code.trim();
    if (lang && lang.toLowerCase() === 'mermaid') {
      // Mermaid: render as placeholder div + toolbar + collapsible code
      const id = 'mmd-' + Date.now() + '-' + blocks.length;
      blocks.push(
        '<div class="md-mermaid-wrap">' +
          '<div class="md-mermaid-toolbar">' +
            '<button class="md-mermaid-expand" title="Expand diagram">⛶ Expand</button>' +
          '</div>' +
          '<div class="md-mermaid" data-mermaid-id="' + id + '">' + esc(trimmed) + '</div>' +
          '<details class="md-mermaid-code"><summary>View Mermaid Code</summary>' +
          '<pre class="md-pre"><code class="md-code lang-mermaid">' + esc(trimmed) + '</code></pre>' +
          '</details>' +
        '</div>'
      );
    } else {
      blocks.push(
        '<pre class="md-pre"><code class="md-code' +
        (lang ? ' lang-' + esc(lang) : '') + '">' +
        esc(trimmed) + '</code></pre>'
      );
    }
    return '\x00B' + (blocks.length - 1) + '\x00';
  });

  t = esc(t);
  t = t.replace(/`([^`]+)`/g, '<code class="md-ic">$1</code>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, txt: string, url: string) =>
    /^https?:\/\//i.test(url)
      ? '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + txt + '</a>'
      : txt + ' (' + url + ')'
  );

  const lines = t.split('\n');
  const out: string[] = [];
  let inUl = false, inOl = false, inBq = false, inTbl = false, tblR = 0;

  function closeAll() {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
    if (inBq) { out.push('</blockquote>'); inBq = false; }
    if (inTbl) { out.push('</table>'); inTbl = false; tblR = 0; }
  }

  for (const line of lines) {
    if (line.includes('\x00B')) {
      closeAll();
      out.push(line.replace(/\x00B(\d+)\x00/g, (_, i) => blocks[+i]));
      continue;
    }
    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) { closeAll(); out.push('<h' + hm[1].length + ' class="md-h">' + hm[2] + '</h' + hm[1].length + '>'); continue; }
    if (/^-{3,}$/.test(line.trim())) { closeAll(); out.push('<hr class="md-hr">'); continue; }
    if (/^&gt;\s?/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (inTbl) { out.push('</table>'); inTbl = false; tblR = 0; }
      if (!inBq) { out.push('<blockquote class="md-bq">'); inBq = true; }
      out.push(line.replace(/^&gt;\s?/, '') + '<br>');
      continue;
    } else if (inBq) { out.push('</blockquote>'); inBq = false; }
    if (/^\|.+\|/.test(line.trim())) {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) continue;
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (inBq) { out.push('</blockquote>'); inBq = false; }
      if (!inTbl) { out.push('<table class="md-tbl">'); inTbl = true; tblR = 0; }
      const cells = line.split('|').filter(c => c.trim());
      const tag = tblR === 0 ? 'th' : 'td';
      out.push('<tr>' + cells.map(c => '<' + tag + '>' + c.trim() + '</' + tag + '>').join('') + '</tr>');
      tblR++;
      continue;
    } else if (inTbl) { out.push('</table>'); inTbl = false; tblR = 0; }
    if (/^\s*[-*]\s+/.test(line)) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (inTbl) { out.push('</table>'); inTbl = false; tblR = 0; }
      if (!inUl) { out.push('<ul class="md-ul">'); inUl = true; }
      out.push('<li>' + line.replace(/^\s*[-*]\s+/, '') + '</li>');
      continue;
    } else if (inUl) { out.push('</ul>'); inUl = false; }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inTbl) { out.push('</table>'); inTbl = false; tblR = 0; }
      if (!inOl) { out.push('<ol class="md-ol">'); inOl = true; }
      out.push('<li>' + line.replace(/^\s*\d+\.\s+/, '') + '</li>');
      continue;
    } else if (inOl) { out.push('</ol>'); inOl = false; }
    if (line.trim()) out.push('<p class="md-p">' + line + '</p>');
  }
  closeAll();
  return out.join('');
}

// ── Mermaid Diagram Renderer ──────────────────────────────────
// Uses bundled mermaid (no CDN dependency — Intel firewall blocks CDN).
// SVG cache persists across DOM rebuilds (maximize/minimize).

import mermaid from 'mermaid';

let mermaidInitialized = false;
const mermaidSvgCache: Record<string, string> = {};  // normalized code → svg
let mermaidIdCounter = 0;

function mermaidCacheKey(code: string): string {
  return code.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize mermaid code to fix common LLM mistakes:
 * - Split chained edges (A -->|x| B -->|y| C) into separate lines
 * - Ensure edge labels with special chars are quoted
 */
function sanitizeMermaidCode(code: string): string {
  const lines = code.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip non-edge lines (subgraph, end, %%, declarations, empty)
    if (!trimmed || /^(%|subgraph|end|flowchart|graph|classDef|class |style )/.test(trimmed)) {
      out.push(line);
      continue;
    }
    // Detect chained edges: lines with 2+ arrows (-->)
    const arrowCount = (trimmed.match(/-->/g) || []).length;
    if (arrowCount > 1) {
      // Split chained edges into individual lines
      // Match pattern: NodeID -->|"label"| NodeID or NodeID --> NodeID
      const edgePattern = /([A-Za-z0-9_]+(?:\[.*?\])?)\s*(-->)\s*(\|[^|]*\|)?\s*/g;
      const nodes: { id: string; label?: string }[] = [];
      let match;
      let lastIndex = 0;
      while ((match = edgePattern.exec(trimmed)) !== null) {
        nodes.push({ id: match[1], label: match[3] });
        lastIndex = edgePattern.lastIndex;
      }
      // Capture the final node (after the last arrow)
      const remainder = trimmed.slice(lastIndex).trim();
      if (remainder) {
        nodes.push({ id: remainder });
      }
      // Emit one edge per line
      if (nodes.length >= 2) {
        for (let i = 0; i < nodes.length - 1; i++) {
          const src = nodes[i].id;
          const lbl = nodes[i].label || '';
          const tgt = nodes[i + 1].id;
          out.push(`  ${src} --> ${lbl} ${tgt}`.replace(/\s+/g, ' ').trim());
        }
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

function ensureMermaidInit(): void {
  if (mermaidInitialized) return;
  mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
  mermaidInitialized = true;
}

export function renderMermaidDiagrams(container?: HTMLElement | null): void {
  const els = (container || document).querySelectorAll<HTMLElement>('.md-mermaid[data-mermaid-id]');
  if (!els.length) return;

  // First pass: inject cached SVGs immediately (synchronous)
  const pending: HTMLElement[] = [];
  els.forEach((el) => {
    if (el.dataset.rendered) return;
    const code = el.textContent || '';
    const key = mermaidCacheKey(code);
    if (mermaidSvgCache[key]) {
      el.innerHTML = mermaidSvgCache[key];
      el.classList.add('md-mermaid-rendered');
      el.dataset.rendered = 'true';
    } else {
      pending.push(el);
    }
  });

  // Second pass: render uncached diagrams via bundled mermaid
  if (!pending.length) return;
  ensureMermaidInit();
  pending.forEach((el) => {
    if (el.dataset.rendered) return;
    el.dataset.rendered = 'true';
    const rawCode = el.textContent || '';
    const code = sanitizeMermaidCode(rawCode);
    const key = mermaidCacheKey(code);
    const id = 'mmd-' + (++mermaidIdCounter);
    try {
      mermaid.render(id, code).then((result) => {
        mermaidSvgCache[key] = result.svg;
        el.innerHTML = result.svg;
        el.classList.add('md-mermaid-rendered');
      }).catch(() => {
        el.innerHTML = '<pre class="md-pre"><code class="md-code lang-mermaid">' + esc(rawCode) + '</code></pre>';
        el.classList.add('md-mermaid-error');
      });
    } catch {
      el.innerHTML = '<pre class="md-pre"><code class="md-code lang-mermaid">' + esc(rawCode) + '</code></pre>';
      el.classList.add('md-mermaid-error');
    }
  });
}
