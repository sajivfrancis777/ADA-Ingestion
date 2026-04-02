/**
 * Local storage persistence for workbook data.
 *
 * Saves/loads JSON-serialized WorkbookData keyed by tower+cap+release+state.
 * When Azure Functions are ready, this can be swapped for GitHub API writes.
 */
import type { WorkbookData } from './xlsxUtils';

const PREFIX = 'iao-portal:';

function storageKey(tower: string, cap: string, release: string, state: string): string {
  return `${PREFIX}${tower}/${cap}/${release}/${state}`;
}

/** Save workbook data to localStorage. Returns true on success. */
export function saveToLocal(
  tower: string,
  cap: string,
  release: string,
  state: string,
  data: WorkbookData,
): boolean {
  try {
    const key = storageKey(tower, cap, release, state);
    localStorage.setItem(key, JSON.stringify(data));
    // Track last-saved timestamp
    localStorage.setItem(`${key}:ts`, new Date().toISOString());
    return true;
  } catch {
    return false; // quota exceeded or private browsing
  }
}

/** Load workbook data from localStorage, or null if not found. */
export function loadFromLocal(
  tower: string,
  cap: string,
  release: string,
  state: string,
): WorkbookData | null {
  try {
    const key = storageKey(tower, cap, release, state);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as WorkbookData;
  } catch {
    return null;
  }
}

/** Get the last-saved timestamp for a given context, or null. */
export function getLastSaved(
  tower: string,
  cap: string,
  release: string,
  state: string,
): string | null {
  try {
    const key = storageKey(tower, cap, release, state);
    return localStorage.getItem(`${key}:ts`);
  } catch {
    return null;
  }
}
