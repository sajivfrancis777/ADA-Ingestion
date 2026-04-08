/**
 * GitHub Contents API — save workbook data as XLSX to the IAO-Architecture repo.
 *
 * Commits directly via the GitHub Contents API (PUT /repos/.../contents/...).
 * Requires a PAT with `contents:write` scope on the target repo.
 *
 * Writes XLSX (not JSON) to the canonical tower path so the document-generation
 * pipeline can read the same file without any conversion step:
 *   towers/{tower}/<L1 folder>/{capId}/input/data/{release_}{state}Flows.xlsx
 */
import type { WorkbookData } from './xlsxUtils';
import { workbookToXlsxBase64 } from './xlsxUtils';
import { resolveFilePath, resolveCapabilityBasePath, invalidateTreeCache } from './githubFetch';

const OWNER = 'sajivfrancis777';
const REPO  = 'IAO-Architecture';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

/* ── Token management ──────────────────────────────────────────── */

const TOKEN_KEY = 'iao-github-write-token';

/** Store a write-capable PAT in localStorage (never sent to any server). */
export function setWriteToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

/** Retrieve the stored PAT. */
export function getWriteToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the stored PAT. */
export function clearWriteToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Check if a write token is configured. */
export function hasWriteToken(): boolean {
  const t = getWriteToken();
  return !!t && t.length > 10;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

/**
 * Build the XLSX filename from release + state.
 * e.g. ('All','Current') → 'CurrentFlows.xlsx'
 *      ('R1','Future')   → 'R1_FutureFlows.xlsx'
 */
function buildFilename(release: string, state: string): string {
  const prefix = release === 'All' ? '' : `${release}_`;
  return `${prefix}${state}Flows.xlsx`;
}

/* ── Core save function ────────────────────────────────────────── */

export interface SaveResult {
  ok: boolean;
  message: string;
  commitSha?: string;
  url?: string;
}

/**
 * Save workbook data as XLSX to the canonical tower path in the GitHub repo.
 * Creates or updates the file via the Contents API.
 *
 * @param knownRepoPath  If already known (e.g. from a previous fetch), pass it
 *                       to skip path resolution.
 */
export async function saveToGitHub(
  tower: string,
  cap: string,
  release: string,
  state: string,
  data: WorkbookData,
  knownRepoPath?: string,
  commitMessage?: string,
): Promise<SaveResult> {
  const token = getWriteToken();
  if (!token) {
    return { ok: false, message: 'No GitHub write token configured. Click ⚙ to set one.' };
  }

  // ── Resolve the target repo path ──────────────────────────────
  const filename = buildFilename(release, state);
  let path = knownRepoPath;

  if (!path) {
    // Try to find the exact file first
    path = (await resolveFilePath(tower, cap, filename)) ?? undefined;
  }

  if (!path) {
    // File doesn't exist yet — derive base path from any sibling file
    const basePath = await resolveCapabilityBasePath(tower, cap);
    if (basePath) {
      path = `${basePath}${filename}`;
    }
  }

  if (!path) {
    return {
      ok: false,
      message: `Cannot resolve repo path for ${tower}/${cap}. Ensure the capability directory exists in the repo.`,
    };
  }

  const headers = authHeaders(token);

  // 1. Check if file already exists (get its SHA for update)
  let existingSha: string | undefined;
  try {
    const getRes = await fetch(`${API}/${path}?ref=main`, { headers });
    if (getRes.ok) {
      const existing = await getRes.json();
      existingSha = existing.sha;
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      return {
        ok: false,
        message: `GitHub API error (${getRes.status}): ${(err as Record<string, string>).message ?? getRes.statusText}`,
      };
    }
  } catch (e) {
    return { ok: false, message: `Network error checking file: ${e instanceof Error ? e.message : 'unknown'}` };
  }

  // 2. Convert WorkbookData → XLSX binary (base64)
  const content = workbookToXlsxBase64(data);
  const msg = commitMessage ?? `Update ${tower}/${cap} ${release} ${state} flows`;

  // 3. Create or update via PUT
  const body: Record<string, unknown> = {
    message: msg,
    content,
    branch: 'main',
  };
  if (existingSha) body.sha = existingSha;

  try {
    const putRes = await fetch(`${API}/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (putRes.ok || putRes.status === 201) {
      const result = await putRes.json();
      // Invalidate tree cache so FileTree picks up the new/updated file
      invalidateTreeCache();
      return {
        ok: true,
        message: existingSha ? 'Updated on GitHub' : 'Created on GitHub',
        commitSha: result.commit?.sha,
        url: result.content?.html_url,
      };
    }

    const err = await putRes.json().catch(() => ({}));
    if (putRes.status === 401) {
      return { ok: false, message: 'GitHub token is invalid or expired. Click ⚙ to update it.' };
    }
    if (putRes.status === 403) {
      return { ok: false, message: 'Token lacks write access. Use a PAT with Contents: Read and write scope.' };
    }
    if (putRes.status === 409) {
      return { ok: false, message: 'Conflict — the file was modified by someone else. Reload and try again.' };
    }
    return {
      ok: false,
      message: `GitHub API error (${putRes.status}): ${(err as Record<string, string>).message ?? putRes.statusText}`,
    };
  } catch (e) {
    return { ok: false, message: `Network error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}

/**
 * Validate that a token has write access to the repo.
 * Makes a lightweight GET to the repo API and checks push permission.
 */
export async function validateToken(token: string): Promise<{ valid: boolean; message: string }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers: authHeaders(token),
    });
    if (!res.ok) {
      return { valid: false, message: `Token check failed (${res.status})` };
    }
    const repo = await res.json();
    if (repo.permissions?.push) {
      return { valid: true, message: 'Token has write access ✓' };
    }
    return { valid: false, message: 'Token is read-only. Need Contents: Read and write scope.' };
  } catch {
    return { valid: false, message: 'Network error — check your connection' };
  }
}
