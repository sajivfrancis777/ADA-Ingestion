/**
 * flowsToMermaid.ts — Convert AG Grid Flows tab rows into Mermaid flowchart syntax.
 *
 * TypeScript port of the core logic from mermaid_builder.py.
 * Produces the same swim-lane layout used in the published SAD documents:
 *   - Subgraphs per Source/Target Lane (TB layout, LR inside each lane)
 *   - Edges labeled with Interface / Technology
 *   - Professional styling with Intel blue accent
 */

/** Minimal flow row shape from the Flows tab */
export interface FlowRow {
  'Flow Chain'?: string;
  'Hop #'?: number | string;
  'Source System'?: string;
  'Source Lane'?: string;
  'Target System'?: string;
  'Target Lane'?: string;
  'Interface / Technology'?: string;
  'Frequency'?: string;
  'Data Description'?: string;
  'Source DB Platform'?: string;
  'Target DB Platform'?: string;
  'Source Tech Platform'?: string;
  'Target Tech Platform'?: string;
  'Integration Pattern'?: string;
  [key: string]: unknown;
}

/** Architecture layer for diagram generation */
export type ArchLayer = 'application' | 'data' | 'technology';

interface MermaidNode {
  id: string;
  label: string;
  lane: string;
}

interface MermaidEdge {
  sourceId: string;
  targetId: string;
  label: string;
}

/** Sanitize a string for use as a Mermaid node/subgraph ID */
function sanitizeId(prefix: string, name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `${prefix}_${clean}`;
}

/** Truncate long labels */
function truncate(s: string, max = 28): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

/** Lane sort key — keeps common architectural lanes in logical order */
const LANE_ORDER: Record<string, number> = {
  'Business': 0, 'Business Process': 0,
  'Application': 1, 'SAP': 1, 'S/4HANA': 1,
  'Integration': 2, 'Middleware': 2, 'MuleSoft': 2,
  'Data': 3, 'Data Warehouse': 3, 'Snowflake': 3,
  'Technology': 4, 'Infrastructure': 4,
};

function laneSortKey(lane: string): number {
  return LANE_ORDER[lane] ?? 50;
}

/** Pastel lane colors (rotate) */
const LANE_COLORS: [string, string][] = [
  ['fill:#E8F0FE', 'stroke:#4285F4'],   // Blue
  ['fill:#E6F4EA', 'stroke:#34A853'],   // Green
  ['fill:#FEF7E0', 'stroke:#FBBC04'],   // Yellow
  ['fill:#FCE4EC', 'stroke:#EA4335'],   // Red
  ['fill:#F3E5F5', 'stroke:#9C27B0'],   // Purple
  ['fill:#E0F7FA', 'stroke:#00ACC1'],   // Cyan
  ['fill:#FFF3E0', 'stroke:#FF9800'],   // Orange
];

/** Layer-specific field mappings */
const LAYER_CONFIG: Record<ArchLayer, {
  title: string;
  srcField: keyof FlowRow;
  tgtField: keyof FlowRow;
  srcLaneField: keyof FlowRow;
  tgtLaneField: keyof FlowRow;
  edgeField: keyof FlowRow;
  nodeStyle: string;
}> = {
  application: {
    title: 'Application Architecture',
    srcField: 'Source System',
    tgtField: 'Target System',
    srcLaneField: 'Source Lane',
    tgtLaneField: 'Target Lane',
    edgeField: 'Interface / Technology',
    nodeStyle: 'fill:#E8F0FE,stroke:#0071C5,stroke-width:2px,color:#1A237E',
  },
  data: {
    title: 'Data Architecture',
    srcField: 'Source DB Platform',
    tgtField: 'Target DB Platform',
    srcLaneField: 'Source Lane',
    tgtLaneField: 'Target Lane',
    edgeField: 'Data Description',
    nodeStyle: 'fill:#BBDEFB,stroke:#1565C0,stroke-width:2px,color:#0D47A1',
  },
  technology: {
    title: 'Technology Architecture',
    srcField: 'Source Tech Platform',
    tgtField: 'Target Tech Platform',
    srcLaneField: 'Source Lane',
    tgtLaneField: 'Target Lane',
    edgeField: 'Integration Pattern',
    nodeStyle: 'fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px,color:#1B5E20',
  },
};

/**
 * Convert an array of Flows tab rows into a Mermaid flowchart string.
 * @param rows — Flows tab grid data
 * @param layer — which architecture layer to render
 * @param prefix — Mermaid ID prefix
 * Returns empty string if no valid hops found.
 */
export function flowsToMermaid(rows: FlowRow[], layer: ArchLayer = 'application', prefix = 'FW'): string {
  const cfg = LAYER_CONFIG[layer];
  const nodes = new Map<string, MermaidNode>();
  const edges: MermaidEdge[] = [];
  const lanes = new Map<string, string[]>();

  for (const row of rows) {
    const src = String(row[cfg.srcField] ?? '').trim();
    const tgt = String(row[cfg.tgtField] ?? '').trim();
    if (!src || !tgt) continue;

    // For data/tech layers, use the Flow Chain as grouping lane if no lane specified
    const srcLane = String(row[cfg.srcLaneField] ?? '').trim() || String(row['Flow Chain'] ?? 'Other').trim() || 'Other';
    const tgtLane = String(row[cfg.tgtLaneField] ?? '').trim() || String(row['Flow Chain'] ?? 'Other').trim() || 'Other';
    const edgeLabel = String(row[cfg.edgeField] ?? '').trim();

    const srcId = sanitizeId(prefix, src);
    const tgtId = sanitizeId(prefix, tgt);

    if (!nodes.has(srcId)) {
      nodes.set(srcId, { id: srcId, label: src, lane: srcLane });
      const arr = lanes.get(srcLane) ?? [];
      arr.push(srcId);
      lanes.set(srcLane, arr);
    }
    if (!nodes.has(tgtId)) {
      nodes.set(tgtId, { id: tgtId, label: tgt, lane: tgtLane });
      const arr = lanes.get(tgtLane) ?? [];
      arr.push(tgtId);
      lanes.set(tgtLane, arr);
    }

    edges.push({
      sourceId: srcId,
      targetId: tgtId,
      label: edgeLabel ? truncate(edgeLabel) : '',
    });
  }

  if (nodes.size === 0) return '';

  // Build Mermaid lines
  const lines: string[] = [];

  lines.push('%%{init: {"theme": "base", "securityLevel": "loose", ' +
    '"themeVariables": {"fontSize": "16px", "fontFamily": "Segoe UI, Arial, sans-serif", ' +
    '"primaryColor": "#e8f0fe", "primaryBorderColor": "#0071c5", ' +
    '"lineColor": "#37474F", "secondaryColor": "#f5f8fc"}, ' +
    '"flowchart": {"useMaxWidth": true, "htmlLabels": true, "curve": "basis", ' +
    '"nodeSpacing": 40, "rankSpacing": 50}} }%%');
  lines.push('flowchart TB');
  lines.push('');

  // Swim lanes (subgraphs)
  const sortedLanes = [...lanes.keys()].sort((a, b) => laneSortKey(a) - laneSortKey(b));
  const laneStyles: { id: string; fill: string; stroke: string }[] = [];

  for (let i = 0; i < sortedLanes.length; i++) {
    const lane = sortedLanes[i];
    const sgId = sanitizeId(prefix + '_SG', lane);
    const [fill, stroke] = LANE_COLORS[i % LANE_COLORS.length];
    laneStyles.push({ id: sgId, fill, stroke });

    lines.push(`    subgraph ${sgId}[" ${lane}"]`);
    lines.push(`        direction LR`);
    const nodeIds = lanes.get(lane) ?? [];
    for (const nid of [...new Set(nodeIds)].sort()) {
      const node = nodes.get(nid)!;
      lines.push(`        ${nid}["${node.label}"]`);
    }
    lines.push('    end');
    lines.push('');
  }

  // Edges (deduplicated)
  const seenEdges = new Set<string>();
  for (const edge of edges) {
    const key = `${edge.sourceId}|${edge.targetId}|${edge.label}`;
    if (seenEdges.has(key)) continue;
    seenEdges.add(key);
    if (edge.label) {
      lines.push(`    ${edge.sourceId} -->|"${edge.label}"| ${edge.targetId}`);
    } else {
      lines.push(`    ${edge.sourceId} --> ${edge.targetId}`);
    }
  }
  lines.push('');

  // Node styling (layer-specific colors)
  lines.push(`    classDef default ${cfg.nodeStyle}`);
  lines.push('');

  // Lane subgraph styles
  for (const { id, fill, stroke } of laneStyles) {
    lines.push(`    style ${id} ${fill},${stroke},stroke-width:2px`);
  }

  return lines.join('\n');
}
