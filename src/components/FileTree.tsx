/**
 * FileTree — Collapsible sidebar showing the expected folder structure
 * for towers/capabilities in the Architecture repo.
 *
 * Static tree derived from towerRegistry + naming conventions.
 * Clicking an XLSX file fetches it from GitHub and opens it in the editor.
 * CSVs are consolidated as tabs within each XLSX workbook.
 */
import { useState, useMemo } from 'react';
import { TOWERS, CAPABILITIES } from '../data/towerRegistry';

const RELEASES = ['R1', 'R2', 'R3', 'R4', 'R5'] as const;
const XLSX_TABS = ['Flows', 'Business Drivers', 'Success Criteria', 'NFRs', 'Security Controls', 'Recommendations'];

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
  icon?: string;
  /** Tag shown next to file name */
  tag?: string;
  /** For file nodes: metadata for fetching from GitHub */
  meta?: { tower: string; capId: string };
}

/** Build the expected XLSX file list for a capability. */
function buildCapabilityFiles(tower: string, capId: string): FileNode[] {
  const files: FileNode[] = [
    { name: 'CurrentFlows.xlsx', type: 'file', icon: '📊', tag: 'universal', meta: { tower, capId } },
    { name: 'FutureFlows.xlsx', type: 'file', icon: '📊', tag: 'universal', meta: { tower, capId } },
  ];
  for (const r of RELEASES) {
    files.push({ name: `${r}_CurrentFlows.xlsx`, type: 'file', icon: '📊', tag: r, meta: { tower, capId } });
    files.push({ name: `${r}_FutureFlows.xlsx`, type: 'file', icon: '📊', tag: r, meta: { tower, capId } });
  }
  return files;
}

export interface RecentUpload {
  tower: string;
  cap: string;
  folder: string;   // 'uploads' | 'bpmn' | 'extracts'
  filename: string;
}

function uploadIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'bpmn') return '🔀';
  if (ext === 'vsd' || ext === 'vsdx') return '📐';
  if (ext === 'drawio') return '📐';
  if (ext === 'xml') return '📐';
  if (ext === 'json') return '📋';
  return '📄';
}

/** Build the full tree from the tower registry + any recent uploads. */
function buildTree(recentUploads: RecentUpload[] = []): FileNode[] {
  return TOWERS.map(tower => ({
    name: tower.id,
    type: 'folder' as const,
    icon: '🏗️',
    children: (CAPABILITIES[tower.id] ?? []).map(cap => {
      // Collect recent uploads for this tower/cap grouped by folder
      const capUploads = recentUploads.filter(u => u.tower === tower.id && u.cap === cap.id);
      const bpmnUploads = capUploads.filter(u => u.folder === 'bpmn');
      const diagramUploads = capUploads.filter(u => u.folder === 'uploads');

      return {
        name: cap.id,
        type: 'folder' as const,
        icon: '📁',
        children: [
          {
            name: 'input',
            type: 'folder' as const,
            children: [
              {
                name: 'data',
                type: 'folder' as const,
                icon: '📂',
                children: buildCapabilityFiles(tower.id, cap.id),
              },
              {
                name: 'uploads',
                type: 'folder' as const,
                icon: '📐',
                children: diagramUploads.length > 0
                  ? diagramUploads.map(u => ({
                      name: u.filename,
                      type: 'file' as const,
                      icon: uploadIcon(u.filename),
                      tag: '✓ new',
                    }))
                  : [{ name: '(upload diagrams here)', type: 'file' as const, icon: '💡' }],
              },
              {
                name: 'bpmn',
                type: 'folder' as const,
                icon: '🔀',
                children: bpmnUploads.length > 0
                  ? bpmnUploads.map(u => ({
                      name: u.filename,
                      type: 'file' as const,
                      icon: '🔀',
                      tag: '✓ new',
                    }))
                  : [{ name: '(upload .bpmn here)', type: 'file' as const, icon: '💡' }],
              },
            ],
          },
        ],
      };
    }),
  }));
}

/* ── Tree node component ── */
function TreeNode({
  node,
  depth,
  selectedCap,
  onSelectCap,
  onFileClick,
  loadingFile,
}: {
  node: FileNode;
  depth: number;
  selectedCap: string;
  onSelectCap: (capId: string) => void;
  onFileClick?: (tower: string, capId: string, filename: string) => void;
  loadingFile?: string;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === 'folder';
  const isCapFolder = depth === 1;
  const isActive = isCapFolder && node.name === selectedCap;
  const isXlsx = !isFolder && node.name.endsWith('.xlsx');
  const isLoading = loadingFile === node.name;

  const handleClick = () => {
    if (isFolder) {
      setOpen(o => !o);
    }
    if (isCapFolder) {
      onSelectCap(node.name);
    }
    if (isXlsx && node.meta && onFileClick) {
      onFileClick(node.meta.tower, node.meta.capId, node.name);
    }
  };

  const paddingLeft = 12 + depth * 16;

  return (
    <>
      <div
        className={`ft-node ${isActive ? 'ft-active' : ''} ${isFolder ? 'ft-folder' : 'ft-file'} ${isXlsx ? 'ft-xlsx' : ''} ${isLoading ? 'ft-loading' : ''}`}
        style={{ paddingLeft }}
        onClick={handleClick}
        title={isXlsx ? `Click to open ${node.name} from GitHub` : isCapFolder ? `Select ${node.name}` : node.name}
      >
        {isFolder && (
          <span className={`ft-arrow ${open ? 'ft-arrow-open' : ''}`}>▶</span>
        )}
        <span className="ft-icon">{isLoading ? '⏳' : (node.icon ?? (isFolder ? '📁' : '📄'))}</span>
        <span className="ft-name">{node.name}</span>
        {node.tag && <span className={`ft-tag ft-tag-${node.tag.toLowerCase()}`}>{node.tag}</span>}
      </div>
      {isFolder && open && node.children?.map((child, i) => (
        <TreeNode
          key={`${child.name}-${i}`}
          node={child}
          depth={depth + 1}
          selectedCap={selectedCap}
          onSelectCap={onSelectCap}
          onFileClick={onFileClick}
          loadingFile={loadingFile}
        />
      ))}
    </>
  );
}

/* ── Search filter ── */
function filterTree(nodes: FileNode[], query: string): FileNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();
  return nodes
    .map(node => {
      if (node.type === 'file') {
        return node.name.toLowerCase().includes(q) ? node : null;
      }
      // Folder: if name matches, keep whole subtree; else filter children
      if (node.name.toLowerCase().includes(q)) return node;
      const filteredChildren = node.children ? filterTree(node.children, query) : [];
      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean) as FileNode[];
}

/* ── Main component ── */
export default function FileTree({
  collapsed,
  onToggle,
  selectedTower,
  selectedCap,
  onSelectCap,
  onFileClick,
  loadingFile,
  recentUploads,
}: {
  collapsed: boolean;
  onToggle: () => void;
  selectedTower: string;
  selectedCap: string;
  onSelectCap: (capId: string) => void;
  onFileClick?: (tower: string, capId: string, filename: string) => void;
  loadingFile?: string;
  recentUploads?: RecentUpload[];
}) {
  const [search, setSearch] = useState('');
  const uploads = recentUploads ?? [];
  const tree = useMemo(() => buildTree(uploads), [uploads]);

  // Show only the selected tower's subtree
  const towerNode = tree.find(t => t.name === selectedTower);
  const visibleNodes = towerNode ? [towerNode] : tree;
  const filtered = useMemo(() => filterTree(visibleNodes, search), [visibleNodes, search]);

  if (collapsed) {
    return (
      <div className="ft-collapsed" onClick={onToggle} title="Expand file tree">
        <span className="ft-collapsed-icon">📂</span>
      </div>
    );
  }

  return (
    <aside className="ft-sidebar">
      <div className="ft-header">
        <span className="ft-title">📂 File Explorer</span>
        <button className="ft-collapse-btn" onClick={onToggle} title="Collapse">◀</button>
      </div>
      <div className="ft-search">
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="ft-info">
        <span>Tower: <strong>{selectedTower}</strong></span>
        <span className="ft-info-hint">Click any XLSX to open from GitHub</span>
        <span className="ft-info-tabs">Each XLSX contains {XLSX_TABS.length} tabs: {XLSX_TABS.join(', ')}</span>
      </div>
      <div className="ft-tree">
        {filtered.length === 0 && (
          <div className="ft-empty">No matching files</div>
        )}
        {filtered.map((node, i) => (
          <TreeNode
            key={`${node.name}-${i}`}
            node={node}
            depth={0}
            selectedCap={selectedCap}
            onSelectCap={onSelectCap}
            onFileClick={onFileClick}
            loadingFile={loadingFile}
          />
        ))}
      </div>
    </aside>
  );
}
