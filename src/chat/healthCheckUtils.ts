/**
 * healthCheckUtils.ts — Comprehensive diagnostic health checks for the ADA Editor.
 *
 * Runs 8 checks with remediation guidance:
 *   1. GitHub Pages Fetch   (can we reach the architecture knowledge base?)
 *   2. SSL / Cert Chain     (TLS handshake valid?)
 *   3. Context Index Load   (JSON parses with capabilities?)
 *   4. Ollama Local LLM     (local model server available?)
 *   5. LLM Configuration    (API key / provider configured?)
 *   6. GitHub PAT Token     (save-to-GitHub enabled?)
 *   7. LocalStorage Quota   (enough space for history/config?)
 *   8. Browser APIs         (required Web APIs available?)
 *
 * Chain: GitHub → SSL → Context Index.
 * Independent: Ollama, LLM Config, GitHub PAT, LocalStorage, Browser APIs.
 */

// ── Types ───────────────────────────────────────────────────────

export type CheckStatus = 'idle' | 'running' | 'pass' | 'warn' | 'fail';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  fix: string;           // Remediation guidance
  durationMs: number;
}

export interface HealthReport {
  results: CheckResult[];
  ranAt: string;
  overallStatus: CheckStatus;
}

// ── Status icon map (for UI) ────────────────────────────────────

export const STATUS_ICON: Record<CheckStatus, string> = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
  running: '◌',
  idle: '○',
};

// ── URL constants ───────────────────────────────────────────────

const CONTEXT_INDEX_URL =
  import.meta.env.VITE_CONTEXT_INDEX_URL ??
  'https://sajivfrancis777.github.io/ADA-Artifacts/context-index.json';

const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434';

// ── Helpers ─────────────────────────────────────────────────────

const CHECK_TIMEOUT_MS = 5000;

function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function timed<T>(fn: () => Promise<T>): Promise<{ value: T; ms: number }> {
  const t0 = performance.now();
  return fn().then(
    (value) => ({ value, ms: Math.round(performance.now() - t0) }),
    (err) => { throw Object.assign(err, { ms: Math.round(performance.now() - t0) }); },
  );
}

function chk(
  id: string, label: string, status: CheckStatus,
  detail: string, fix: string, durationMs: number,
): CheckResult {
  return { id, label, status, detail, fix, durationMs };
}

// ── Individual checks ───────────────────────────────────────────

// 1. GitHub Pages reachability
async function checkGitHubPages(): Promise<CheckResult> {
  const id = 'github-pages', label = 'GitHub Pages';
  const fix = 'Check your internet connection. If behind a corporate proxy, ensure *.github.io is allowed. Verify the ADA-Artifacts repo has GitHub Pages enabled (Settings → Pages → Source: GitHub Actions).';
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(CONTEXT_INDEX_URL, { method: 'HEAD', cache: 'no-store' }),
    );
    if (res.ok) return chk(id, label, 'pass', `Reachable (HTTP ${res.status})`, '', ms);
    if (res.status === 404) return chk(id, label, 'fail', 'HTTP 404 — context-index.json not found', 'Run the ADA-Artifacts build pipeline to regenerate and deploy context-index.json to GitHub Pages.', ms);
    return chk(id, label, 'fail', `HTTP ${res.status} ${res.statusText}`, fix, ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    if (msg.includes('abort')) return chk(id, label, 'fail', `Timeout after ${CHECK_TIMEOUT_MS}ms`, fix + ' The server may be slow or blocked by a firewall.', ms);
    return chk(id, label, 'fail', msg, fix, ms);
  }
}

// 2. SSL / TLS certificate chain
async function checkSSL(): Promise<CheckResult> {
  const id = 'ssl-cert', label = 'SSL / TLS';
  const fix = 'If running locally (localhost), this is expected due to CORS. On GitHub Pages or Azure, this should pass. If it fails in production, check that the SSL certificate is valid and not expired. On Intel corporate network, ensure the proxy CA is trusted.';
  try {
    const url = new URL(CONTEXT_INDEX_URL);
    if (url.protocol !== 'https:') return chk(id, label, 'warn', 'Not using HTTPS', 'Switch VITE_CONTEXT_INDEX_URL to an https:// URL.', 0);
    const { ms } = await timed(() =>
      timedFetch(`${url.origin}/`, { method: 'HEAD', cache: 'no-store' }),
    );
    return chk(id, label, 'pass', `TLS handshake OK (${ms}ms)`, '', ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    if (/cert|SSL|TLS/i.test(msg)) return chk(id, label, 'fail', `Certificate error: ${msg}`, 'The SSL certificate may be self-signed or expired. Add the CA to your trust store, or use verify=false for dev.', ms);
    return chk(id, label, 'warn', `Cross-origin blocked: ${msg}`, fix, ms);
  }
}

// 3. Context Index — full parse
async function checkContextIndex(): Promise<CheckResult> {
  const id = 'context-index', label = 'Context Index';
  const fix = 'Run the ADA-Artifacts build pipeline (build_context_index.py) to regenerate context-index.json. Verify it deploys to GitHub Pages at: ' + CONTEXT_INDEX_URL;
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(CONTEXT_INDEX_URL, { cache: 'no-store' }),
    );
    if (!res.ok) return chk(id, label, 'fail', `HTTP ${res.status}`, fix, ms);
    const text = await res.text();
    const bytes = new Blob([text]).size;
    try {
      const json = JSON.parse(text);
      const caps = json.capabilities ? Object.keys(json.capabilities).length : 0;
      const flows = json.flowIndex ? json.flowIndex.length : 0;
      const systems = json.systems ? json.systems.length : 0;
      if (caps === 0) return chk(id, label, 'warn', `JSON valid but 0 capabilities (${Math.round(bytes / 1024)} KB)`, 'The file parsed but has no capabilities. Rebuild context-index.json from the latest tower YAML + Excel flow files.', ms);
      return chk(id, label, 'pass', `${caps} caps, ${flows} flows, ${systems} systems (${Math.round(bytes / 1024)} KB)`, '', ms);
    } catch {
      return chk(id, label, 'warn', `Non-JSON format (${Math.round(bytes / 1024)} KB)`, 'The file was returned but is not valid JSON. Check that the build pipeline outputs JSON, not HTML or Markdown.', ms);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    return chk(id, label, 'fail', msg, fix, ms);
  }
}

// 4. Ollama local LLM
async function checkOllama(): Promise<CheckResult> {
  const id = 'ollama', label = 'Ollama Local LLM';
  const fix = 'Install Ollama from https://ollama.com and run: ollama serve. Then pull a model: ollama pull llama3. Ollama runs at localhost:11434 by default.';
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(`${OLLAMA_URL}/api/tags`, { cache: 'no-store' }),
    );
    if (!res.ok) return chk(id, label, 'fail', `HTTP ${res.status}`, fix, ms);
    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models : [];
    if (models.length === 0) return chk(id, label, 'warn', 'Running but no models installed', 'Pull a model: ollama pull llama3', ms);
    const names = models.slice(0, 3).map((m: { name: string }) => m.name).join(', ');
    return chk(id, label, 'pass', `${models.length} model(s): ${names}`, '', ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    if (msg.includes('abort')) return chk(id, label, 'warn', 'Not running (timeout)', fix, ms);
    return chk(id, label, 'warn', 'Not reachable', fix, ms);
  }
}

// 5. LLM Configuration
function checkLLMConfig(): CheckResult {
  const id = 'llm-config', label = 'LLM Configuration';
  const fix = 'Click your profile icon (bottom-right) → set Provider, API Key, and Model. For local demos use Ollama (no key needed). For iGPT use Custom Endpoint with Bearer token.';
  try {
    const raw = localStorage.getItem('iao_llm_config');
    if (!raw) return chk(id, label, 'warn', 'No config — chat will prompt for setup', fix, 0);
    const cfg = JSON.parse(raw);
    const provider = cfg.provider || 'unknown';
    if (provider === 'ollama') return chk(id, label, 'pass', `Ollama / ${cfg.model || 'llama3'} (no key needed)`, '', 0);
    if (provider === 'custom') {
      if (!cfg.endpoint) return chk(id, label, 'warn', 'Custom provider but no endpoint URL', 'Set the endpoint URL in profile settings (e.g. iGPT gateway URL).', 0);
      return chk(id, label, 'pass', `Custom / ${cfg.model || 'default'} → ${cfg.endpoint.slice(0, 40)}…`, '', 0);
    }
    if (!cfg.apiKey) return chk(id, label, 'warn', `${provider} selected but no API key`, fix, 0);
    return chk(id, label, 'pass', `${provider} / ${cfg.model || 'default'}`, '', 0);
  } catch {
    return chk(id, label, 'fail', 'Config parse error', 'Clear your browser localStorage for iao_llm_config and reconfigure.', 0);
  }
}

// 6. GitHub PAT Token
function checkGitHubPAT(): CheckResult {
  const id = 'github-pat', label = 'GitHub PAT Token';
  const fix = 'Click the ⚙️ gear icon in the toolbar → enter a GitHub Personal Access Token (classic) with repo scope. Generate one at: https://github.com/settings/tokens';
  try {
    const token = localStorage.getItem('github_token') || import.meta.env.VITE_GITHUB_TOKEN || '';
    if (!token) return chk(id, label, 'warn', 'No token — save to GitHub disabled', fix, 0);
    if (/^(ghp_|github_pat_)/.test(token)) {
      // Check if token looks expired (> 1 year old based on common expiry)
      return chk(id, label, 'pass', `Token set (${token.slice(0, 7)}…${token.slice(-4)})`, '', 0);
    }
    return chk(id, label, 'warn', 'Token set but format not recognized (expected ghp_ or github_pat_ prefix)', 'Ensure you are using a GitHub Personal Access Token, not an OAuth or SSH key.', 0);
  } catch {
    return chk(id, label, 'warn', 'Could not read token', fix, 0);
  }
}

// 7. LocalStorage quota
function checkLocalStorage(): CheckResult {
  const id = 'localstorage', label = 'LocalStorage';
  const fix = 'Clear old chat history: Profile → Export History, then clear. Or use browser DevTools → Application → Local Storage → Clear site data.';
  try {
    // Estimate used space
    let usedBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) usedBytes += key.length + (localStorage.getItem(key)?.length ?? 0);
    }
    usedBytes *= 2; // UTF-16

    // Test write capacity
    const testKey = '__hc_quota_test__';
    const testVal = 'x'.repeat(1024); // 1 KB
    localStorage.setItem(testKey, testVal);
    localStorage.removeItem(testKey);

    const usedKB = Math.round(usedBytes / 1024);
    if (usedKB > 4000) return chk(id, label, 'warn', `${usedKB} KB used — nearing 5 MB limit`, fix, 0);
    return chk(id, label, 'pass', `${usedKB} KB used`, '', 0);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('quota') || msg.includes('QuotaExceeded')) {
      return chk(id, label, 'fail', 'Storage quota exceeded', fix, 0);
    }
    return chk(id, label, 'fail', `Storage error: ${msg}`, fix, 0);
  }
}

// 8. Browser API compatibility
function checkBrowserAPIs(): CheckResult {
  const id = 'browser-apis', label = 'Browser APIs';
  const missing: string[] = [];
  if (typeof AbortController === 'undefined') missing.push('AbortController');
  if (typeof crypto === 'undefined' || !crypto.subtle) missing.push('crypto.subtle');
  if (typeof Blob === 'undefined') missing.push('Blob');
  if (typeof TextEncoder === 'undefined') missing.push('TextEncoder');
  if (!window.fetch) missing.push('fetch');
  if (!window.localStorage) missing.push('localStorage');

  if (missing.length > 0) {
    return chk(id, label, 'fail', `Missing: ${missing.join(', ')}`, 'Update your browser to the latest version of Chrome, Edge, or Firefox.', 0);
  }
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Unknown';
  return chk(id, label, 'pass', `${browser} — all APIs available`, '', 0);
}

// ── Main runner ─────────────────────────────────────────────────

/**
 * Runs all 8 health checks:
 *   Chained:     GitHub Pages → SSL → Context Index
 *   Parallel:    Ollama
 *   Sync:        LLM Config, GitHub PAT, LocalStorage, Browser APIs
 */
export async function runHealthChecks(
  onProgress?: (results: CheckResult[]) => void,
): Promise<HealthReport> {
  const results: CheckResult[] = [];

  const emit = () => onProgress?.([...results]);

  async function safe(id: string, label: string, fn: () => Promise<CheckResult>): Promise<CheckResult> {
    try { return await fn(); }
    catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[HealthCheck] ${id} threw:`, e);
      return chk(id, label, 'fail', `Unexpected: ${msg}`, 'Check browser console for stack trace.', 0);
    }
  }

  // 1. GitHub Pages
  const gh = await safe('github-pages', 'GitHub Pages', checkGitHubPages);
  results.push(gh);
  emit();

  // 2. SSL (depends on GitHub)
  const ssl = gh.status === 'fail'
    ? chk('ssl-cert', 'SSL / TLS', 'fail', 'Skipped (GitHub unreachable)', 'Fix GitHub Pages connectivity first.', 0)
    : await safe('ssl-cert', 'SSL / TLS', checkSSL);
  results.push(ssl);
  emit();

  // 3. Context Index (depends on GitHub)
  const ctx = gh.status === 'fail'
    ? chk('context-index', 'Context Index', 'fail', 'Skipped (GitHub unreachable)', 'Fix GitHub Pages connectivity first.', 0)
    : await safe('context-index', 'Context Index', checkContextIndex);
  results.push(ctx);
  emit();

  // 4. Ollama (parallel, independent)
  const ollama = await safe('ollama', 'Ollama Local LLM', checkOllama);
  results.push(ollama);
  emit();

  // 5-8. Sync checks
  results.push(checkLLMConfig());
  results.push(checkGitHubPAT());
  results.push(checkLocalStorage());
  results.push(checkBrowserAPIs());
  emit();

  // Overall
  const statuses = results.map((r) => r.status);
  let overallStatus: CheckStatus = 'pass';
  if (statuses.includes('fail')) overallStatus = 'fail';
  else if (statuses.includes('warn')) overallStatus = 'warn';

  return { results, ranAt: new Date().toISOString(), overallStatus };
}
