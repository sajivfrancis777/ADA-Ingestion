/**
 * FileTree — Collapsible sidebar showing the expected folder structure
 * for towers/capabilities in the Architecture repo.
 *
 * Static tree derived from towerRegistry + naming conventions.
 * When Azure Functions are ready, this will call the GitHub Contents API
 * to show live files with real CRUD operations.
 */
import { useState, useMemo } from 'react';
import { TOWERS, CAPABILITIES } from '../data/towerRegistry';

const RELEASES = ['R3', 'R4', 'R5'] as const;

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
  icon?: string;
  /** Tag shown next to file name */
  tag?: string;
}

/** Build the expected file list for a capability's input/data folder. */
function buildCapabilityFiles(_capId: string): FileNode[] {
  const files: FileNode[] = [
    { name: 'CurrentFlows.xlsx', type: 'file', icon: '📊', tag: 'universal' },
    { name: 'FutureFlows.xlsx', type: 'file', icon: '📊', tag: 'universal' },
  ];
  for (const r of RELEASES) {
    files.push({ name: `${r}_CurrentFlows.xlsx`, type: 'file', icon: '📊', tag: r });
    files.push({ name: `${r}_FutureFlows.xlsx`, type: 'file', icon: '📊', tag: r });
  }
  files.push(
    { name: 'BusinessDrivers.csv', type: 'file', icon: '📄' },
    { name: 'SuccessCriteria.csv', type: 'file', icon: '📄' },
    { name: 'NFRs.csv', type: 'file', icon: '📄' },
    { name: 'SecurityControls.csv', type: 'file', icon: '📄' },
    { name: 'Recommendations.csv', type: 'file', icon: '📄' },
  );
  return files;
}

function buildBpmnFiles(): FileNode[] {
  return [
    { name: '*.bpmn', type: 'file', icon: '🔀', tag: 'universal' },
  ];
}

/** Build the full tree from the tower registry. */
function buildTree(): FileNode[] {
  return TOWERS.map(tower => ({
    name: tower.id,
    type: 'folder' as const,
    icon: '🏗️',
    children: (CAPABILITIES[tower.id] ?? []).map(cap => ({
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
              children: buildCapabilityFiles(cap.id),
            },
            {
              name: 'bpmn',
              type: 'folder' as const,
              icon: '📂',
              children: buildBpmnFiles(),
            },
          ],
        },
      ],
    })),
  }));
}

/* ── Tree node component ── */
function TreeNode({
  node,
  depth,
  selectedCap,
  onSelectCap,
}: {
  node: FileNode;
  depth: number;
  selectedCap: string;
  onSelectCap: (capId: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === 'folder';
  const isCapFolder = depth === 1;
  const isActive = isCapFolder && node.name === selectedCap;

  const handleClick = () => {
    if (isFolder) {
      setOpen(o => !o);
    }
    if (isCapFolder) {
      onSelectCap(node.name);
    }
  };

  const paddingLeft = 12 + depth * 16;

  return (
    <>
      <div
        className={`ft-node ${isActive ? 'ft-active' : ''} ${isFolder ? 'ft-folder' : 'ft-file'}`}
        style={{ paddingLeft }}
        onClick={handleClick}
        title={isCapFolder ? `Select ${node.name}` : node.name}
      >
        {isFolder && (
          <span className={`ft-arrow ${open ? 'ft-arrow-open' : ''}`}>▶</span>
        )}
        <span className="ft-icon">{node.icon ?? (isFolder ? '📁' : '📄')}</span>
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
}: {
  collapsed: boolean;
  onToggle: () => void;
  selectedTower: string;
  selectedCap: string;
  onSelectCap: (capId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const tree = useMemo(buildTree, []);

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
        <span className="ft-info-hint">Static view — live CRUD when Azure Functions ready</span>
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
          />
        ))}
      </div>
    </aside>
  );
}
