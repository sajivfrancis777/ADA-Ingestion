/**
 * GitHub API utilities for fetching XLSX files from the IAO-Architecture repo.
 *
 * Uses the Git Trees API (one call, cached) to discover all file paths,
 * then the Git Blobs API to fetch content as ArrayBuffer.
 * Works without authentication for public repos (60 req/hr limit).
 */

const OWNER = 'sajivfrancis777';
const REPO = 'IAO-Architecture';
const API_BASE = `https://api.github.com/repos/${OWNER}/${REPO}`;
const BRANCH = 'main';

/* ── Types ─────────────────────────────────────────────────────── */

interface TreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface FileInfo {
  /** 'All' for universal files, 'R1'-'R5' for release-specific */
  release: string;
  /** 'Current' or 'Future' */
  state: string;
}

/* ── Path index (cached in memory) ────────────────────────────── */

let pathIndex: Map<string, string> | null = null;

/**
 * Fetch the full recursive tree from GitHub and build a path→SHA index.
 * Result is cached for the lifetime of the page.
 */
async function ensureIndex(): Promise<Map<string, string>> {
  if (pathIndex) return pathIndex;

  const res = await fetch(`${API_BASE}/git/trees/${BRANCH}?recursive=1`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? 'GitHub API rate limit exceeded. Try again in a few minutes.'
        : `GitHub API error: ${res.status} ${res.statusText}`,
    );
  }

  const data: { tree: TreeEntry[]; truncated: boolean } = await res.json();
  pathIndex = new Map();
  for (const entry of data.tree) {
    if (entry.type === 'blob') {
      pathIndex.set(entry.path, entry.sha);
    }
  }
  return pathIndex;
}

/* ── Public API ────────────────────────────────────────────────── */

/**
 * Find the full repo path for a capability's file.
 * Matches pattern: towers/{tower}/<any L1 folder>/{capId}/input/data/{filename}
 */
export async function resolveFilePath(
  tower: string,
  capId: string,
  filename: string,
): Promise<string | null> {
  const index = await ensureIndex();
  const suffix = `/${capId}/input/data/${filename}`;

  for (const [path] of index) {
    if (path.startsWith(`towers/${tower}/`) && path.endsWith(suffix)) {
      return path;
    }
  }
  return null;
}

/**
 * List actual XLSX/BPMN files that exist for a capability in the repo.
 */
export async function listCapabilityFiles(
  tower: string,
  capId: string,
): Promise<string[]> {
  const index = await ensureIndex();
  const results: string[] = [];

  for (const [path] of index) {
    if (
      path.startsWith(`towers/${tower}/`) &&
      path.includes(`/${capId}/input/`)
    ) {
      results.push(path.split('/').pop()!);
    }
  }
  return results;
}

/**
 * Fetch a file from GitHub by its repo path and return as ArrayBuffer.
 * Uses the Git Blobs API (SHA-based) to avoid path-encoding issues.
 */
export async function fetchFileContent(repoPath: string): Promise<ArrayBuffer> {
  const index = await ensureIndex();
  const sha = index.get(repoPath);
  if (!sha) throw new Error(`File not found in repo: ${repoPath}`);

  const res = await fetch(`${API_BASE}/git/blobs/${sha}`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!res.ok) {
    throw new Error(
      res.status === 403
        ? 'GitHub API rate limit exceeded.'
        : `GitHub blob API: ${res.status} ${res.statusText}`,
    );
  }

  const data: { content: string; encoding: string } = await res.json();

  // Decode base64 → ArrayBuffer (strip whitespace GitHub adds to base64)
  const raw = atob(data.content.replace(/\s/g, ''));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Parse release + state from an XLSX filename.
 *   CurrentFlows.xlsx       → { release: 'All', state: 'Current' }
 *   R3_FutureFlows.xlsx     → { release: 'R3',  state: 'Future' }
 */
export function parseFileInfo(filename: string): FileInfo {
  const m = filename.match(/^(?:(R\d+)_)?(Current|Future)Flows\.xlsx$/i);
  if (!m) return { release: 'All', state: 'Current' };
  return {
    release: m[1] ?? 'All',
    state: m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase(),
  };
}
