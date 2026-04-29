/**
 * healthCheck.ts — Diagnostic health checks for the multi-provider chat system.
 *
 * Runs 6 checks in dependency order:
 *   1. GitHub Raw Fetch   (can we reach GitHub Pages?)
 *   2. SSL / Cert Chain   (TLS handshake succeeded?)
 *   3. Env Variables      (required VITE_* vars present?)
 *   4. Cloudflare Worker  (proxy reachable?)
 *   5. Ollama             (local model server up?)
 *   6. Context Index Load (full parse succeeds?)
 *
 * Chain dependency: GitHub → SSL → Context Index.
 * Independent: Env Variables, Cloudflare Worker, Ollama.
 */

// ── Types ───────────────────────────────────────────────────────

export type CheckStatus = 'idle' | 'running' | 'pass' | 'warn' | 'fail';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
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

const WORKER_URL = import.meta.env.VITE_WORKER_URL ?? '';
const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL ?? 'http://localhost:11434';

// ── Required env vars ───────────────────────────────────────────

const REQUIRED_ENV: { key: string; label: string }[] = [
  { key: 'VITE_CONTEXT_INDEX_URL', label: 'Context Index URL' },
];

const OPTIONAL_ENV: { key: string; label: string }[] = [
  { key: 'VITE_WORKER_URL', label: 'Cloudflare Worker URL' },
  { key: 'VITE_OLLAMA_URL', label: 'Ollama URL' },
  { key: 'VITE_ANTHROPIC_MODEL', label: 'Anthropic Model' },
  { key: 'VITE_ANTHROPIC_WORKER_URL', label: 'Anthropic Worker URL' },
];

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

function result(
  id: string,
  label: string,
  status: CheckStatus,
  detail: string,
  durationMs: number,
): CheckResult {
  return { id, label, status, detail, durationMs };
}

// ── Individual checks ───────────────────────────────────────────

async function checkGitHubRaw(): Promise<CheckResult> {
  const id = 'github-raw';
  const label = 'GitHub Raw Fetch';
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(CONTEXT_INDEX_URL, { method: 'HEAD', cache: 'no-store' }),
    );
    if (res.ok) return result(id, label, 'pass', `HTTP ${res.status}`, ms);
    return result(id, label, 'fail', `HTTP ${res.status} ${res.statusText}`, ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    return result(id, label, 'fail', msg.includes('abort') ? `Timeout (${CHECK_TIMEOUT_MS}ms)` : msg, ms);
  }
}

async function checkSSL(): Promise<CheckResult> {
  const id = 'ssl-cert';
  const label = 'SSL / Cert Chain';
  try {
    const url = new URL(CONTEXT_INDEX_URL);
    if (url.protocol !== 'https:') {
      return result(id, label, 'warn', 'Not using HTTPS', 0);
    }
    // If GitHub HEAD succeeded, TLS handshake passed — lightweight re-check
    const { ms } = await timed(() =>
      timedFetch(`${url.origin}/`, { method: 'HEAD', cache: 'no-store' }),
    );
    return result(id, label, 'pass', `TLS handshake OK (${ms}ms)`, ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    if (msg.includes('cert') || msg.includes('SSL') || msg.includes('TLS')) {
      return result(id, label, 'fail', `Certificate error: ${msg}`, ms);
    }
    return result(id, label, 'warn', msg, ms);
  }
}

function checkEnvVars(): CheckResult {
  const id = 'env-vars';
  const label = 'Environment Variables';

  const missing = REQUIRED_ENV.filter(
    (e) => !import.meta.env[e.key],
  );
  const optMissing = OPTIONAL_ENV.filter(
    (e) => !import.meta.env[e.key],
  );

  if (missing.length > 0) {
    return result(
      id, label, 'fail',
      `Missing required: ${missing.map((e) => e.key).join(', ')}`,
      0,
    );
  }
  if (optMissing.length > 0) {
    return result(
      id, label, 'warn',
      `Optional missing: ${optMissing.map((e) => e.key).join(', ')}`,
      0,
    );
  }
  return result(id, label, 'pass', 'All env vars set', 0);
}

async function checkCloudflareWorker(): Promise<CheckResult> {
  const id = 'cf-worker';
  const label = 'Cloudflare Worker';
  if (!WORKER_URL) {
    return result(id, label, 'warn', 'VITE_WORKER_URL not configured', 0);
  }
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(WORKER_URL, { method: 'OPTIONS', cache: 'no-store' }),
    );
    // Workers typically return 200 or 204 for OPTIONS
    if (res.ok || res.status === 204) {
      return result(id, label, 'pass', `Reachable (${ms}ms)`, ms);
    }
    return result(id, label, 'warn', `HTTP ${res.status}`, ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    return result(id, label, 'fail', msg, ms);
  }
}

async function checkOllama(): Promise<CheckResult> {
  const id = 'ollama';
  const label = 'Ollama';
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(`${OLLAMA_URL}/api/tags`, { cache: 'no-store' }),
    );
    if (!res.ok) {
      return result(id, label, 'fail', `HTTP ${res.status}`, ms);
    }
    const data = await res.json();
    const models = Array.isArray(data.models) ? data.models.length : 0;
    return result(id, label, 'pass', `${models} model(s) available`, ms);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    return result(id, label, 'warn', msg.includes('abort') ? 'Not running (timeout)' : `Not reachable: ${msg}`, ms);
  }
}

async function checkContextIndex(): Promise<CheckResult> {
  const id = 'context-index';
  const label = 'Context Index Load';
  try {
    const { value: res, ms } = await timed(() =>
      timedFetch(CONTEXT_INDEX_URL, { cache: 'no-store' }),
    );
    if (!res.ok) {
      return result(id, label, 'fail', `HTTP ${res.status}`, ms);
    }
    const text = await res.text();
    const bytes = new Blob([text]).size;
    // Try JSON parse to validate
    try {
      const json = JSON.parse(text);
      const caps = Array.isArray(json.capabilities) ? json.capabilities.length : '?';
      return result(
        id, label, 'pass',
        `${caps} capabilities, ${(bytes / 1024).toFixed(0)} KB`,
        ms,
      );
    } catch {
      // Not JSON — still usable as text/markdown
      return result(
        id, label, 'warn',
        `Non-JSON format, ${(bytes / 1024).toFixed(0)} KB`,
        ms,
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const ms = (err as { ms?: number }).ms ?? 0;
    return result(id, label, 'fail', msg, ms);
  }
}

// ── Main runner ─────────────────────────────────────────────────

/**
 * Runs all health checks respecting the dependency chain:
 *   GitHub → SSL → Context Index (chained)
 *   Env Vars, Cloudflare Worker, Ollama (independent / parallel)
 */
export async function runHealthChecks(
  onProgress?: (results: CheckResult[]) => void,
): Promise<HealthReport> {
  const results: CheckResult[] = [];

  const emit = () => onProgress?.([...results]);

  // ── Chain: GitHub → SSL → Context Index ──
  const github = await checkGitHubRaw();
  results.push(github);
  emit();

  let ssl: CheckResult;
  if (github.status === 'fail') {
    ssl = result('ssl-cert', 'SSL / Cert Chain', 'fail', 'Skipped (GitHub unreachable)', 0);
  } else {
    ssl = await checkSSL();
  }
  results.push(ssl);
  emit();

  // ── Independent checks (parallel) ──
  const [envVars, worker, ollama] = await Promise.all([
    Promise.resolve(checkEnvVars()),
    checkCloudflareWorker(),
    checkOllama(),
  ]);
  results.push(envVars, worker, ollama);
  emit();

  // ── Context Index (depends on GitHub) ──
  let ctx: CheckResult;
  if (github.status === 'fail') {
    ctx = result('context-index', 'Context Index Load', 'fail', 'Skipped (GitHub unreachable)', 0);
  } else {
    ctx = await checkContextIndex();
  }
  results.push(ctx);
  emit();

  // ── Overall ──
  const statuses = results.map((r) => r.status);
  let overallStatus: CheckStatus = 'pass';
  if (statuses.includes('fail')) overallStatus = 'fail';
  else if (statuses.includes('warn')) overallStatus = 'warn';

  return {
    results,
    ranAt: new Date().toISOString(),
    overallStatus,
  };
}
