/**
 * IAO Architecture — ADA Editor — Main Application
 *
 * Provides tower/capability/release/state selectors, 6-tab AG Grid editor,
 * and XLSX load/download via SheetJS.
 * Pre-loads DS-020 template data for ALL capabilities as a gold standard
 * that architects can overwrite with their own data.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import TowerSelector from './components/TowerSelector';
import Toolbar from './components/Toolbar';
import TabEditor from './components/TabEditor';
import type { TabEditorHandle } from './components/TabEditor';
import FileTree from './components/FileTree';
import GitHubTokenModal from './components/GitHubTokenModal';
import { AuthProvider } from './auth/AuthContext';
import ChatFAB from './chat/ChatFAB';
import './chat/chat.css';
import { TOWERS, CAPABILITIES } from './data/towerRegistry';
import { PROJECTS, getDefaultProject, type ProjectInfo } from './data/projectRegistry';
import { generateSampleData } from './data/sampleDataGenerator';
import { loadWorkbook, downloadWorkbook, createBlankWorkbook } from './utils/xlsxUtils';
import { resolveFilePath, resolveCapabilityBasePath, fetchFileContent, parseFileInfo, listCapabilityInputFiles } from './utils/githubFetch';
import type { CapabilityInputFiles } from './utils/githubFetch';
import { saveToLocal, loadFromLocal, getLastSaved } from './utils/localSave';
import { saveToGitHub, hasWriteToken } from './utils/githubSave';
import { parseDiagram, buildHopsJson } from './utils/diagramParser';
import { uploadDiagramToGitHub, uploadBpmnToGitHub, uploadHopsJsonToGitHub } from './utils/githubDiagramUpload';
import type { WorkbookData } from './utils/xlsxUtils';
import type { Release, FlowState } from './components/TowerSelector';
import ds020Sample from './data/ds020_sample.json';

/**
 * Load template data for a tower/capability.
 * DS-020 uses the curated JSON sample; all others use generated data.
 */
function getTemplateData(towerId?: string, capId?: string): WorkbookData {
  // DS-020 has rich hand-curated data — use it
  if (capId === 'DS-020' || !towerId || !capId) {
    const blank = createBlankWorkbook();
    const sample = ds020Sample as Record<string, Record<string, unknown>[]>;
    for (const key of Object.keys(blank)) {
      if (sample[key] && sample[key].length > 0) {
        blank[key] = sample[key];
      }
    }
    return blank;
  }
  // All other capabilities — generate contextual sample data
  const capInfo = CAPABILITIES[towerId]?.find(c => c.id === capId);
  const capName = capInfo?.name?.replace(/^[A-Z0-9-]+ /, '') ?? capId;
  return generateSampleData(towerId, capId, capName);
}

export default function App() {
  const [project, setProject] = useState<ProjectInfo>(getDefaultProject());
  const [tower, setTower] = useState(TOWERS[0].id);
  const firstCap = CAPABILITIES[TOWERS[0].id]?.[0]?.id ?? '';
  const [cap, setCap] = useState(firstCap);
  const [release, setRelease] = useState<Release>('All');
  const [state, setState] = useState<FlowState>('Current');
  // Initial data for TabEditor — only used on first mount
  const [initialData] = useState<WorkbookData>(() =>
    loadFromLocal(TOWERS[0].id, firstCap, 'All', 'Current') ?? getTemplateData(TOWERS[0].id, firstCap)
  );
  const [dirty, setDirty] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loadingFile, setLoadingFile] = useState<string | undefined>();
  const [loadedFile, setLoadedFile] = useState<string | undefined>();
  const [fetchError, setFetchError] = useState<string | undefined>();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<string | null>(
    () => getLastSaved(TOWERS[0].id, firstCap, 'All', 'Current')
  );
  const [githubStatus, setGithubStatus] = useState<'idle' | 'pushing' | 'pushed' | 'error'>('idle');
  const [githubMessage, setGithubMessage] = useState<string>('');
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [hasToken, setHasToken] = useState(() => hasWriteToken());
  const [sourceRepoPath, setSourceRepoPath] = useState<string | undefined>();
  const autoFetchId = useRef(0);
  const dirtyRef = useRef(false);
  const editorRef = useRef<TabEditorHandle>(null);
  const [diagramStatus, setDiagramStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle');
  const [diagramMessage, setDiagramMessage] = useState('');
  const [recentUploads, setRecentUploads] = useState<{ tower: string; cap: string; folder: string; filename: string }[]>([]);
  const [persistedFiles, setPersistedFiles] = useState<CapabilityInputFiles | undefined>();
  const [persistedRefresh, setPersistedRefresh] = useState(0);
  const [dragOver, setDragOver] = useState<'xlsx' | 'diagram' | null>(null);

  // Keep dirtyRef in sync for the async effect
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  // Fetch persisted files (uploads/bpmn/extracts) from GitHub when tower/cap changes or after upload
  useEffect(() => {
    let cancelled = false;
    setPersistedFiles(undefined);
    listCapabilityInputFiles(tower, cap)
      .then(files => { if (!cancelled) setPersistedFiles(files); })
      .catch(() => { /* silent — tree still works without persisted files */ });
    return () => { cancelled = true; };
  }, [tower, cap, persistedRefresh]);

  // Stable callback so TabEditor doesn't re-render when App state changes
  const handleDirty = useCallback(() => {
    dirtyRef.current = true;   // synchronous — guards async auto-fetch
    setDirty(true);
    setSaveStatus('idle');
  }, []);

  /**
   * Auto-fetch the XLSX for the current tower/cap/release/state from GitHub
   * whenever navigation changes. Shows real repo data instead of template.
   * Skips if localStorage has a saved draft or if the user has unsaved edits.
   */
  useEffect(() => {
    const localData = loadFromLocal(tower, cap, release, state);
    if (localData) {
      editorRef.current?.loadData(localData);
      setDirty(false);
      setLoadedFile(undefined);
      setSourceRepoPath(undefined);
      setLastSaved(getLastSaved(tower, cap, release, state));
      setSaveStatus('idle');
      return;
    }

    const id = ++autoFetchId.current;
    const prefix = release === 'All' ? '' : `${release}_`;
    const filename = `${prefix}${state}Flows.xlsx`;

    (async () => {
      try {
        const repoPath = await resolveFilePath(tower, cap, filename);
        if (id !== autoFetchId.current) return;
        if (!repoPath) {
          editorRef.current?.loadData(getTemplateData(tower, cap));
          setDirty(false);
          setLoadedFile(`${filename} (template — not yet in repo)`);
          setSourceRepoPath(undefined);
          return;
        }
        setLoadingFile(filename);
        const buffer = await fetchFileContent(repoPath);
        if (id !== autoFetchId.current || dirtyRef.current) return;
        const wb = loadWorkbook(buffer);
        editorRef.current?.loadData(wb);
        setDirty(false);
        setLoadedFile(filename);
        setSourceRepoPath(repoPath);
      } catch {
        if (id !== autoFetchId.current) return;
        editorRef.current?.loadData(getTemplateData(tower, cap));
        setDirty(false);
        setLoadedFile(undefined);
        setSourceRepoPath(undefined);
      } finally {
        if (id === autoFetchId.current) setLoadingFile(undefined);
      }
    })();
  }, [tower, cap, release, state]);

  const handleTowerChange = useCallback((newTower: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch tower? Changes will be lost.')) {
      return;
    }
    setTower(newTower);
    const newCaps = CAPABILITIES[newTower] ?? [];
    const newCap = newCaps.length > 0 ? newCaps[0].id : '';
    if (newCaps.length > 0) setCap(newCap);
    editorRef.current?.loadData(loadFromLocal(newTower, newCap, release, state) ?? getTemplateData(newTower, newCap));
    setDirty(false);
    setSaveStatus('idle');
    setLastSaved(getLastSaved(newTower, newCap, release, state));
    setLoadedFile(undefined);
    setSourceRepoPath(undefined);
  }, [dirty, release, state]);

  const handleCapChange = useCallback((newCap: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch capability? Changes will be lost.')) {
      return;
    }
    setCap(newCap);
    editorRef.current?.loadData(loadFromLocal(tower, newCap, release, state) ?? getTemplateData(tower, newCap));
    setDirty(false);
    setSaveStatus('idle');
    setLastSaved(getLastSaved(tower, newCap, release, state));
    setLoadedFile(undefined);
    setSourceRepoPath(undefined);
  }, [dirty, tower, release, state]);

  const handleLoadFile = useCallback((buffer: ArrayBuffer) => {
    const wb = loadWorkbook(buffer);
    editorRef.current?.loadData(wb);
    setDirty(false);
  }, []);

  const handleDownload = useCallback(() => {
    const currentData = editorRef.current?.flush() ?? createBlankWorkbook();
    const prefix = release === 'All' ? '' : `${release}_`;
    const filename = `${prefix}${state}Flows.xlsx`;
    downloadWorkbook(currentData, filename);
    setDirty(false);
  }, [release, state]);

  const handleSave = useCallback(() => {
    const currentData = editorRef.current?.flush() ?? createBlankWorkbook();
    setSaveStatus('saving');
    const ok = saveToLocal(tower, cap, release, state, currentData);
    if (ok) {
      setSaveStatus('saved');
      setDirty(false);
      setLastSaved(new Date().toISOString());
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('idle');
      alert('Save failed — browser storage may be full.');
    }
  }, [tower, cap, release, state]);

  const handlePushToGitHub = useCallback(async () => {
    const currentData = editorRef.current?.flush() ?? createBlankWorkbook();
    saveToLocal(tower, cap, release, state, currentData);
    setGithubStatus('pushing');
    setGithubMessage('');
    const result = await saveToGitHub(tower, cap, release, state, currentData, sourceRepoPath);
    if (result.ok) {
      setGithubStatus('pushed');
      setGithubMessage(result.message);
      setDirty(false);
      setTimeout(() => setGithubStatus('idle'), 4000);
    } else {
      setGithubStatus('error');
      setGithubMessage(result.message);
    }
  }, [tower, cap, release, state, sourceRepoPath]);

  /**
   * Handle diagram file upload:
   *
   * For .drawio, .vsdx, ArchiMate .xml:
   *   1. Parse the diagram client-side to extract integration hops
   *   2. Merge extracted hops into the current Flows grid
   *   3. Upload original diagram + hops JSON to GitHub (background)
   *
   * For .bpmn:
   *   1. Upload to ADA-Artifacts input/bpmn/ as a manual business process input
   *   2. Does NOT populate the AG Grid — consumed by ADA-Artifacts
   *      capability documentation build as a supplementary business process
   */
  const handleUploadDiagram = useCallback(async (file: File) => {
    setDiagramStatus('parsing');
    setDiagramMessage('');

    try {
      const buffer = await file.arrayBuffer();
      const ext = file.name.toLowerCase().split('.').pop() || '';

      // ── BPMN path: upload-only (no grid population) ──────────
      if (ext === 'bpmn') {
        setDiagramStatus('uploading');
        setDiagramMessage('Uploading BPMN business process to ADA-Artifacts…');

        const bpmnResult = await uploadBpmnToGitHub(tower, cap, file.name, buffer);
        if (bpmnResult.ok) {
          setRecentUploads(prev => [...prev, { tower, cap, folder: 'bpmn', filename: file.name }]);
          setPersistedRefresh(n => n + 1);
          setDiagramStatus('done');
          setDiagramMessage(
            `✓ BPMN uploaded to input/bpmn/ — will be included in the ${cap} capability documentation build.`
          );
          setTimeout(() => { setDiagramStatus('idle'); setDiagramMessage(''); }, 8000);
        } else {
          setDiagramStatus('error');
          setDiagramMessage(bpmnResult.message);
        }
        return;
      }

      // ── .vsd path: legacy binary Visio — upload for background processing ──
      // .vsd cannot be parsed client-side (OLE binary format).
      // Upload to GitHub → GitHub Actions converts to .vsdx → Python parses → hops JSON committed.
      if (ext === 'vsd') {
        setDiagramStatus('uploading');
        setDiagramMessage('Uploading legacy Visio (.vsd) for background processing…');

        const vsdResult = await uploadDiagramToGitHub(tower, cap, file.name, buffer);
        if (vsdResult.ok) {
          setRecentUploads(prev => [...prev, { tower, cap, folder: 'uploads', filename: file.name }]);
          setPersistedRefresh(n => n + 1);
          setDiagramStatus('done');
          setDiagramMessage(
            `✓ Visio .vsd uploaded — background processing will extract hops. Check back in a few minutes for results in input/extracts/.`
          );
          setTimeout(() => { setDiagramStatus('idle'); setDiagramMessage(''); }, 10000);
        } else {
          setDiagramStatus('error');
          setDiagramMessage(vsdResult.message);
        }
        return;
      }

      // ── Draw.io / Visio / ArchiMate path: parse → grid → upload ──
      const result = await parseDiagram(file.name, buffer);

      if (!result.ok) {
        setDiagramStatus('error');
        setDiagramMessage(result.error || 'Parse failed');
        return;
      }

      if (result.sheets.length === 0) {
        setDiagramStatus('error');
        setDiagramMessage('No integration flows found in the diagram.');
        return;
      }

      // Determine which sheet to use — match current release/state, or use first
      const matchingSheet = result.sheets.find(
        s => s.release === release && s.state === state
      ) ?? result.sheets[0];

      // Merge into current grid: append to existing Flows rows
      const currentData = editorRef.current?.flush() ?? createBlankWorkbook();
      const existingFlows = (currentData['Flows'] ?? []).filter(
        (row: Record<string, unknown>) =>
          Object.values(row).some(v => v != null && v !== '')
      );
      const hopRows = matchingSheet.hops as unknown as Record<string, unknown>[];
      const newFlows = [...existingFlows, ...hopRows];
      currentData['Flows'] = newFlows;
      editorRef.current?.loadData(currentData);
      setDirty(true);

      setDiagramStatus('uploading');
      setDiagramMessage(`${result.totalHops} hops extracted — uploading to GitHub…`);

      // Background: upload original diagram + hops JSON to GitHub
      const hopsJson = buildHopsJson(result, file.name, tower, cap);
      const [diagResult, hopsResult] = await Promise.all([
        uploadDiagramToGitHub(tower, cap, file.name, buffer),
        uploadHopsJsonToGitHub(tower, cap, hopsJson),
      ]);

      if (diagResult.ok && hopsResult.ok) {
        setRecentUploads(prev => [...prev, { tower, cap, folder: 'uploads', filename: file.name }]);
        setPersistedRefresh(n => n + 1);
        setDiagramStatus('done');
        setDiagramMessage(
          `✓ ${result.totalHops} hops from ${result.totalChains} chains loaded into grid. Files saved to GitHub.`
        );
        setTimeout(() => { setDiagramStatus('idle'); setDiagramMessage(''); }, 6000);
      } else {
        // Grid was populated (that's the important part), GitHub save is bonus
        setRecentUploads(prev => [...prev, { tower, cap, folder: 'uploads', filename: file.name }]);
        setDiagramStatus('done');
        const ghMsg = !diagResult.ok ? diagResult.message : hopsResult.message;
        setDiagramMessage(
          `✓ ${result.totalHops} hops loaded into grid. GitHub upload note: ${ghMsg}`
        );
        setTimeout(() => { setDiagramStatus('idle'); setDiagramMessage(''); }, 8000);
      }
    } catch (e) {
      setDiagramStatus('error');
      setDiagramMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [tower, cap, release, state]);

  const handleTokenModalClose = useCallback(() => {
    setTokenModalOpen(false);
    setHasToken(hasWriteToken());
  }, []);

  // ── Drag-and-drop support ────────────────────────────────────
  const XLSX_EXTS = new Set(['xlsx', 'xls']);
  const DIAGRAM_EXTS = new Set(['drawio', 'bpmn', 'xml', 'vsdx', 'vsd']);

  const classifyFile = useCallback((name: string): 'xlsx' | 'diagram' | null => {
    const ext = name.toLowerCase().split('.').pop() ?? '';
    if (XLSX_EXTS.has(ext)) return 'xlsx';
    if (DIAGRAM_EXTS.has(ext)) return 'diagram';
    return null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check the first file in the drag
    const item = e.dataTransfer.items?.[0];
    if (!item || item.kind !== 'file') return;
    // Use the filename from items if available, else check types
    const name = (e.dataTransfer.items[0] as DataTransferItem & { name?: string })?.name ?? '';
    if (name) {
      setDragOver(classifyFile(name));
    } else {
      // Fallback: we can't know the filename during dragover in some browsers,
      // so show a generic "drop file" overlay
      setDragOver('diagram');
    }
  }, [classifyFile]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the app root (not child elements)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const kind = classifyFile(file.name);
    if (kind === 'xlsx') {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          handleLoadFile(reader.result);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (kind === 'diagram') {
      handleUploadDiagram(file);
    }
  }, [classifyFile, handleLoadFile, handleUploadDiagram]);

  const handleFileClick = useCallback(async (fileTower: string, capId: string, filename: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Open file from GitHub? Changes will be lost.')) {
      return;
    }
    setFetchError(undefined);
    setLoadingFile(filename);
    try {
      // Auto-sync tower + capability if different from current
      if (fileTower !== tower) {
        setTower(fileTower);
      }
      if (capId !== cap) {
        setCap(capId);
      }

      // ── Extract JSON: merge hops into grid ──────────────────
      if (filename.endsWith('_hops.json')) {
        const basePath = await resolveCapabilityBasePath(fileTower, capId);
        if (!basePath) throw new Error(`Cannot resolve path for ${fileTower}/${capId}`);
        const extractPath = basePath.replace(/data\/$/, `extracts/${filename}`);
        const buf = await fetchFileContent(extractPath);
        const text = new TextDecoder().decode(buf);
        const hopsFile = JSON.parse(text) as {
          metadata: { source_file: string; total_hops: number; total_chains: number };
          sheets: { tabName: string; release: string; state: string; hops: Record<string, unknown>[] }[];
        };

        // Find sheet matching current release/state, or first
        const matchSheet = hopsFile.sheets.find(
          s => s.release === release && s.state === state
        ) ?? hopsFile.sheets[0];

        if (!matchSheet || matchSheet.hops.length === 0) {
          setDiagramStatus('error');
          setDiagramMessage(`No hops found in ${filename} for ${release}/${state}.`);
          return;
        }

        // Merge into current grid
        const currentData = editorRef.current?.flush() ?? createBlankWorkbook();
        const existingFlows = (currentData['Flows'] ?? []).filter(
          (row: Record<string, unknown>) =>
            Object.values(row).some(v => v != null && v !== '')
        );
        currentData['Flows'] = [...existingFlows, ...matchSheet.hops];
        editorRef.current?.loadData(currentData);
        setDirty(true);
        setDiagramStatus('done');
        setDiagramMessage(
          `✓ Loaded ${matchSheet.hops.length} hops from ${filename} (${hopsFile.metadata.source_file}).`
        );
        setTimeout(() => { setDiagramStatus('idle'); setDiagramMessage(''); }, 6000);
        return;
      }

      // ── XLSX files: existing flow ───────────────────────────
      // Auto-sync release + state from filename
      const info = parseFileInfo(filename);
      setRelease(info.release as Release);
      setState(info.state as FlowState);

      // 1. Check localStorage first
      const local = loadFromLocal(fileTower, capId, info.release, info.state);
      if (local) {
        editorRef.current?.loadData(local);
        setDirty(false);
        setLoadedFile(`${filename} (from saved draft)`);
        setLastSaved(getLastSaved(fileTower, capId, info.release, info.state));
        setSaveStatus('idle');
        return;
      }

      // 2. Try GitHub
      const repoPath = await resolveFilePath(fileTower, capId, filename);
      if (!repoPath) {
        editorRef.current?.loadData(getTemplateData(fileTower, capId));
        setDirty(false);
        setLoadedFile(`${filename} (template — not yet in repo)`);
        setSaveStatus('idle');
        setLastSaved(null);
        return;
      }
      const buffer = await fetchFileContent(repoPath);
      const wb = loadWorkbook(buffer);
      editorRef.current?.loadData(wb);
      setDirty(false);
      setLoadedFile(filename);
      setSourceRepoPath(repoPath);
    } catch (err) {
      editorRef.current?.loadData(getTemplateData(fileTower, capId));
      setDirty(false);
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch file');
    } finally {
      setLoadingFile(undefined);
    }
  }, [dirty, tower, cap]);

  const hasData = true;  // Grid always has data (template or loaded)

  // Build context string from current grid data for the chat assistant
  const buildGridContext = useCallback((): string => {
    if (!editorRef.current) return '';
    const data = editorRef.current.flush();
    const flows = data['Flows'] ?? [];
    if (flows.length === 0) return '';
    const towerName = TOWERS.find(t => t.id === tower)?.display ?? tower;
    const capName = CAPABILITIES[tower]?.find(c => c.id === cap)?.name ?? cap;
    let ctx = `Tower: ${towerName}\nCapability: ${capName}\nRelease: ${release}\nState: ${state}\n\n`;
    ctx += `### Flows (${flows.length} rows)\n`;
    const cols = ['Flow Chain', 'Hop #', 'Source System', 'Source Lane', 'Target System', 'Target Lane', 'Interface / Technology', 'Frequency', 'Source DB Platform', 'Target DB Platform', 'Source Tech Platform', 'Target Tech Platform'];
    ctx += cols.join(' | ') + '\n';
    for (const row of flows.slice(0, 50)) { // Cap at 50 rows for token budget
      ctx += cols.map(c => String((row as Record<string, unknown>)[c] ?? '').trim()).join(' | ') + '\n';
    }
    return ctx;
  }, [tower, cap, release, state]);

  return (
    <AuthProvider>
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-and-drop overlay */}
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            {dragOver === 'xlsx' ? (
              <>
                <span className="drop-icon">📊</span>
                <span className="drop-title">Drop XLSX to load data</span>
                <span className="drop-subtitle">Replaces current grid data with the workbook contents</span>
              </>
            ) : (
              <>
                <span className="drop-icon">📐</span>
                <span className="drop-title">Drop diagram to parse &amp; upload</span>
                <span className="drop-subtitle">.drawio, .vsdx, .vsd, .bpmn, ArchiMate .xml</span>
              </>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="app-header">
        <img src="favicon.ico" alt="ADA" className="header-logo" />
        {PROJECTS.length > 1 ? (
          <select
            className="project-selector"
            value={project.id}
            onChange={e => {
              const p = PROJECTS.find(p => p.id === e.target.value);
              if (p) setProject(p);
            }}
          >
            {PROJECTS.map(p => (
              <option key={p.id} value={p.id}>
                {p.theme?.icon ?? '📁'} {p.name}
              </option>
            ))}
          </select>
        ) : (
          <h1>{project.name} — ADA Editor</h1>
        )}
        <span className="header-subtitle">{project.subtitle}</span>
        <a
          href={project.docsUrl}
          className="portal-switch"
          target="_blank"
          rel="noopener noreferrer"
        >
          📄 ADA Docs ↗
        </a>
      </header>

      {/* Sidebar + Main content */}
      <div className="app-body">
        <FileTree
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          selectedTower={tower}
          selectedCap={cap}
          onSelectCap={handleCapChange}
          onFileClick={handleFileClick}
          loadingFile={loadingFile}
          recentUploads={recentUploads}
          persistedFiles={persistedFiles}
        />
        <div className="app-main">
          {/* Tower / Capability / Release / State selectors + file toolbar */}
          <div className="app-controls">
            <TowerSelector
              selectedTower={tower}
              selectedCap={cap}
              selectedRelease={release}
              selectedState={state}
              onTowerChange={handleTowerChange}
              onCapChange={handleCapChange}
              onReleaseChange={setRelease}
              onStateChange={setState}
            />
            <Toolbar
              tower={tower}
              cap={cap}
              release={release}
              state={state}
              hasData={hasData}
              dirty={dirty}
              saveStatus={saveStatus}
              githubStatus={githubStatus}
              githubMessage={githubMessage}
              hasGitHubToken={hasToken}
              lastSaved={lastSaved}
              diagramStatus={diagramStatus}
              diagramMessage={diagramMessage}
              onLoadFile={handleLoadFile}
              onSave={handleSave}
              onPushToGitHub={handlePushToGitHub}
              onDownload={handleDownload}
              onOpenTokenSettings={() => setTokenModalOpen(true)}
              onUploadDiagram={handleUploadDiagram}
            />
          </div>

          {/* Status banners */}
          {loadingFile && (
            <div className="loading-banner">
              ⏳ Loading <strong>{loadingFile}</strong> from GitHub…
            </div>
          )}
          {fetchError && (
            <div className="error-banner" onClick={() => setFetchError(undefined)}>
              ⚠️ {fetchError} <span className="dismiss">✕</span>
            </div>
          )}
          {loadedFile && !dirty && !loadingFile && (
            <div className={`loaded-banner ${loadedFile.includes('template') ? 'loaded-template' : ''}`}>
              {loadedFile.includes('template')
                ? <>📋 <strong>{loadedFile}</strong> — edit and Download XLSX when ready</>
                : <>✅ Loaded <strong>{loadedFile}</strong> from GitHub</>
              }
            </div>
          )}

          {/* Dirty indicator */}
          {dirty && (
            <div className="dirty-banner">
              Unsaved changes — click <strong>Save</strong> to persist or <strong>Download XLSX</strong> to export
            </div>
          )}

          {/* Embedded sheet editor */}
          <div className="sheet-frame">
            <TabEditor ref={editorRef} initialData={initialData} onDirty={handleDirty} />
          </div>
        </div>
      </div>

      {/* GitHub token settings modal */}
      <GitHubTokenModal open={tokenModalOpen} onClose={handleTokenModalClose} />

      {/* AI Chat FAB + Profile */}
      <ChatFAB gridContext={buildGridContext()} />
    </div>
    </AuthProvider>
  );
}
