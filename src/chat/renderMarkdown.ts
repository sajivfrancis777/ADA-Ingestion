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
    blocks.push(
      '<pre class="md-pre"><code class="md-code' +
      (lang ? ' lang-' + esc(lang) : '') + '">' +
      esc(code.trim()) + '</code></pre>'
    );
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
