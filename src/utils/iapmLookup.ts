/**
 * iapmLookup.ts — Resolve system names to IAPM Solution 360 URLs.
 *
 * Architecture:
 *   CURRENT:  Static map (from IAPM_All_Solutions.csv export)
 *   FUTURE:   Live API via Azure Functions when API key is available
 *             Swap: replace getIapmUrl() body with fetch('/api/iapm-lookup?name=...')
 *
 * URL pattern: https://iapm.intel.com/#/app/{applicationId}
 */

const IAPM_BASE_URL = 'https://iapm.intel.com/#/app/';

/**
 * Static map: system name → IAPM applicationId.
 * Keys are CASE-INSENSITIVE (stored lowercase).
 * Generated from IAPM_All_Solutions.csv (30K records, 54 columns).
 *
 * When Azure Functions + API key management is live, this map becomes
 * a local cache layer — live lookups fill in systems not found here.
 */
const STATIC_ID_MAP: Record<string, number> = {
  // ── Exact matches from IAPM CSV (applicationAcronymNm) ──
  'apigee': 22790,
  'bobj': 11591,
  'cibr': 30886,
  'compass': 16439,
  'dcs': 16545,
  'eats': 119,
  'eca': 41049,
  'edw': 4010,
  'fca': 3915,
  'fcs': 9297,
  'graphiteconnect': 36398,
  'icost': 7440,
  'mars': 32079,
  'pdf-smh': 41627,
  'pega': 21207,
  'sap ecc': 8794,
  'sap ibp': 18675,
  'sap icx': 6904,
  'sap sac': 37401,
  'scs': 21327,
  'span': 41279,
  'speed': 25706,
  'sidecar': 37750,
  'snowflake': 35811,
  'wspw': 4119,
  'workstream': 31348,
  'xeus': 17553,
  'iapm': 20808,

  // ── Manual overrides (IAPM name differs from architect usage) ──
  'mulesoft': 19978,        // IAPM: iPaaS-E
  'databricks': 41458,      // IAPM: Databricks in AWS
  'eca-databricks': 41458,
  'eca-snowflake': 35811,

  // ── SAP products — IDs to be confirmed when IAPM enriches CSV ──
  // Uncomment when IDs are validated:
  // 'sap s/4 mdg': ???,
  // 'sap ariba': ???,
  // 'sap bods': ???,
  // 'sap po': ???,
  // 'sap papm': ???,
  // 'sap bobj': 11591,  // same as BOBJ
};

// Alias: BOBJ = SAP BOBJ
STATIC_ID_MAP['sap bobj'] = 11591;

/**
 * Resolve a system name to its IAPM Solution 360 URL.
 *
 * @param systemName — The system name as entered by the architect (case-insensitive).
 * @returns The full IAPM URL, or null if the system is not mapped.
 *
 * FUTURE (Azure Functions):
 *   When API key is available via admin settings, this function will:
 *   1. Check STATIC_ID_MAP first (instant, no network)
 *   2. On miss, call: GET /api/iapm-lookup?name={systemName}
 *   3. Cache the result in sessionStorage for the session
 *   No rewiring needed — just uncomment the fetch block below.
 */
export function getIapmUrl(systemName: string): string | null {
  if (!systemName) return null;

  const key = systemName.trim().toLowerCase();
  const id = STATIC_ID_MAP[key];

  if (id) {
    return `${IAPM_BASE_URL}${id}`;
  }

  // ─── FUTURE: Live API lookup (uncomment when Azure Functions are deployed) ───
  // const apiKey = getApiKeyFromAdminSettings(); // from Azure SWA auth context
  // if (apiKey) {
  //   const cached = sessionStorage.getItem(`iapm-url:${key}`);
  //   if (cached) return cached;
  //   // Non-blocking: queue for async resolution; return null this render
  //   queueIapmLookup(key, apiKey);
  // }
  // ─────────────────────────────────────────────────────────────────────────────

  return null;
}

/**
 * Batch-resolve multiple system names. Returns a map of name → URL (only for found systems).
 * Used by flowsToMermaid to generate click directives for all nodes at once.
 */
export function getIapmUrls(systemNames: string[]): Map<string, string> {
  const urls = new Map<string, string>();
  for (const name of systemNames) {
    const url = getIapmUrl(name);
    if (url) urls.set(name, url);
  }
  return urls;
}
