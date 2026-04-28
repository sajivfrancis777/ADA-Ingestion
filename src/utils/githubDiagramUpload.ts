/**
 * GitHub Diagram Upload — commit uploaded diagram files and their
 * extracted hops JSON to the ADA-Artifacts repo.
 *
 * File layout (in ADA-Artifacts repo):
 *   towers/{tower}/<L1>/{capId}/input/uploads/   ← architecture diagrams (.drawio, .vsdx, ArchiMate .xml)
 *   towers/{tower}/<L1>/{capId}/input/extracts/   ← extracted hops JSON
 *   towers/{tower}/<L1>/{capId}/input/bpmn/       ← manual BPMN business process inputs
 *
 * Uses the same GitHub Contents API as githubSave.ts.
 */

import { getWriteToken } from './githubSave';
import { resolveCapabilityBasePath, invalidateTreeCache } from './githubFetch';
import type { HopsJsonFile } from './diagramParser';

const OWNER = 'sajivfrancis777';
const REPO  = 'ADA-Artifacts';
const API   = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function toBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function timestampPrefix(): string {
  return new Date().toISOString().split('.')[0].split(':').join('-');
}

export interface DiagramUploadResult {
  ok: boolean;
  message: string;
  diagramPath?: string;
  hopsPath?: string;
  commitSha?: string;
}

/**
 * Upload the original diagram file to GitHub under the capability's uploads/ folder.
 */
export async function uploadDiagramToGitHub(
  tower: string,
  cap: string,
  filename: string,
  data: ArrayBuffer,
): Promise<DiagramUploadResult> {
  const token = getWriteToken();
  if (!token) {
    return { ok: false, message: 'No GitHub write token configured. Click ⚙ to set one.' };
  }

  const basePath = await resolveCapabilityBasePath(tower, cap);
  if (!basePath) {
    return {
      ok: false,
      message: `Cannot resolve repo path for ${tower}/${cap}. Ensure the capability directory exists in the repo.`,
    };
  }

  // basePath ends with: towers/{tower}/.../{capId}/input/data/
  // We want: towers/{tower}/.../{capId}/input/uploads/
  const uploadBase = basePath.replace(/data\/$/, 'uploads/');
  const ts = timestampPrefix();
  const diagramPath = `${uploadBase}${ts}_${filename}`;

  const headers = authHeaders(token);
  const content = toBase64(data);

  try {
    const res = await fetch(`${API}/${diagramPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Upload diagram: ${tower}/${cap} — ${filename}`,
        content,
        branch: 'main',
      }),
    });

    if (res.ok || res.status === 201) {
      const result = await res.json();
      invalidateTreeCache();
      return {
        ok: true,
        message: `Diagram uploaded to ${diagramPath}`,
        diagramPath,
        commitSha: result.commit?.sha,
      };
    }

    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      message: `Upload failed (${res.status}): ${(err as Record<string, string>).message ?? res.statusText}`,
    };
  } catch (e) {
    return { ok: false, message: `Network error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}

/**
 * Upload a BPMN file to GitHub under the capability's bpmn/ folder.
 * BPMN files are manual business process inputs — they feed the
 * ADA-Artifacts capability documentation build, NOT the AG Grid.
 */
export async function uploadBpmnToGitHub(
  tower: string,
  cap: string,
  filename: string,
  data: ArrayBuffer,
): Promise<DiagramUploadResult> {
  const token = getWriteToken();
  if (!token) {
    return { ok: false, message: 'No GitHub write token configured. Click ⚙ to set one.' };
  }

  const basePath = await resolveCapabilityBasePath(tower, cap);
  if (!basePath) {
    return {
      ok: false,
      message: `Cannot resolve repo path for ${tower}/${cap}. Ensure the capability directory exists in the repo.`,
    };
  }

  // basePath ends with: towers/{tower}/.../{capId}/input/data/
  // We want: towers/{tower}/.../{capId}/input/bpmn/
  const bpmnBase = basePath.replace(/data\/$/, 'bpmn/');
  const ts = timestampPrefix();
  const bpmnPath = `${bpmnBase}${ts}_${filename}`;

  const headers = authHeaders(token);
  const content = toBase64(data);

  try {
    const res = await fetch(`${API}/${bpmnPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Upload BPMN business process: ${tower}/${cap} — ${filename}`,
        content,
        branch: 'main',
      }),
    });

    if (res.ok || res.status === 201) {
      const result = await res.json();
      invalidateTreeCache();
      return {
        ok: true,
        message: `BPMN uploaded to ${bpmnPath}`,
        diagramPath: bpmnPath,
        commitSha: result.commit?.sha,
      };
    }

    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      message: `Upload failed (${res.status}): ${(err as Record<string, string>).message ?? res.statusText}`,
    };
  } catch (e) {
    return { ok: false, message: `Network error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}

/**
 * Upload the extracted hops JSON to GitHub under the capability's extracts/ folder.
 */
export async function uploadHopsJsonToGitHub(
  tower: string,
  cap: string,
  hopsJson: HopsJsonFile,
): Promise<DiagramUploadResult> {
  const token = getWriteToken();
  if (!token) {
    return { ok: false, message: 'No GitHub write token configured. Click ⚙ to set one.' };
  }

  const basePath = await resolveCapabilityBasePath(tower, cap);
  if (!basePath) {
    return {
      ok: false,
      message: `Cannot resolve repo path for ${tower}/${cap}. Ensure the capability directory exists in the repo.`,
    };
  }

  const extractBase = basePath.replace(/data\/$/, 'extracts/');
  const ts = timestampPrefix();
  const sourceBaseName = hopsJson.metadata.source_file.split('.')[0];
  const hopsPath = `${extractBase}${ts}_${sourceBaseName}_hops.json`;

  const headers = authHeaders(token);
  const jsonStr = JSON.stringify(hopsJson, null, 2);
  const encoder = new TextEncoder();
  const content = toBase64(encoder.encode(jsonStr).buffer as ArrayBuffer);

  try {
    const res = await fetch(`${API}/${hopsPath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Extract hops: ${tower}/${cap} — ${hopsJson.metadata.source_file} (${hopsJson.metadata.total_hops} hops)`,
        content,
        branch: 'main',
      }),
    });

    if (res.ok || res.status === 201) {
      const result = await res.json();
      invalidateTreeCache();
      return {
        ok: true,
        message: `Hops JSON saved to ${hopsPath}`,
        hopsPath,
        commitSha: result.commit?.sha,
      };
    }

    const err = await res.json().catch(() => ({}));
    return {
      ok: false,
      message: `Upload failed (${res.status}): ${(err as Record<string, string>).message ?? res.statusText}`,
    };
  } catch (e) {
    return { ok: false, message: `Network error: ${e instanceof Error ? e.message : 'unknown'}` };
  }
}
