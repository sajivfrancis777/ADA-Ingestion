/**
 * GitHub Contents API — save workbook data as JSON to the IAO-Architecture repo.
 *
 * Commits directly via the GitHub Contents API (PUT /repos/.../contents/...).
 * Requires a PAT with `contents:write` scope on the target repo.
 *
 * File path pattern:
 *   data/input-portal/{tower}/{capId}/{release}_{state}.json
 */
import type { WorkbookData } from './xlsxUtils';

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
 * Build the repo path for the saved JSON.
 * e.g. data/input-portal/FPR/DS-020/All_Current.json
 */
function buildPath(tower: string, cap: string, release: string, state: string): string {
  return `data/input-portal/${tower}/${cap}/${release}_${state}.json`;
}

/**
 * Base64-encode a UTF-8 string for the GitHub Contents API.
 */
function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/* ── Core save function ────────────────────────────────────────── */

export interface SaveResult {
  ok: boolean;
  message: string;
  commitSha?: string;
  url?: string;
}

/**
 * Save workbook data as JSON to the GitHub repo.
 * Creates or updates the file via the Contents API.
 */
export async function saveToGitHub(
  tower: string,
  cap: string,
  release: string,
  state: string,
  data: WorkbookData,
  commitMessage?: string,
): Promise<SaveResult> {
  const token = getWriteToken();
  if (!token) {
    return { ok: false, message: 'No GitHub write token configured. Click ⚙ to set one.' };
  }

  const path = buildPath(tower, cap, release, state);
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

  // 2. Prepare content
  const json = JSON.stringify(data, null, 2);
  const content = utf8ToBase64(json);
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
      // Invalidate sessionStorage tree cache so FileTree picks up the new file
      sessionStorage.removeItem('iao-github-tree');
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
