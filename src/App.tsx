/**
 * IAO Architecture Input Portal — Main Application
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
import FileTree from './components/FileTree';
import GitHubTokenModal from './components/GitHubTokenModal';
import { TOWERS, CAPABILITIES } from './data/towerRegistry';
import { generateSampleData } from './data/sampleDataGenerator';
import { loadWorkbook, downloadWorkbook, createBlankWorkbook } from './utils/xlsxUtils';
import { resolveFilePath, fetchFileContent, parseFileInfo } from './utils/githubFetch';
import { saveToLocal, loadFromLocal, getLastSaved } from './utils/localSave';
import { saveToGitHub, hasWriteToken } from './utils/githubSave';
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
  const [tower, setTower] = useState(TOWERS[0].id);
  const firstCap = CAPABILITIES[TOWERS[0].id]?.[0]?.id ?? '';
  const [cap, setCap] = useState(firstCap);
  const [release, setRelease] = useState<Release>('All');
  const [state, setState] = useState<FlowState>('Current');
  // Load from localStorage if available, otherwise template
  const [data, setData] = useState<WorkbookData>(() =>
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

  // Keep dirtyRef in sync for the async effect
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  /**
   * Auto-fetch the XLSX for the current tower/cap/release/state from GitHub
   * whenever navigation changes. Shows real repo data instead of template.
   * Skips if localStorage has a saved draft or if the user has unsaved edits.
   */
  useEffect(() => {
    // If there's a saved local draft for this context, use it immediately
    const localData = loadFromLocal(tower, cap, release, state);
    if (localData) {
      setData(localData);
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
          // File not in repo — load template, clear stale banner
          setData(getTemplateData(tower, cap));
          setDirty(false);
          setLoadedFile(`${filename} (template — not yet in repo)`);
          setSourceRepoPath(undefined);
          return;
        }
        setLoadingFile(filename);
        const buffer = await fetchFileContent(repoPath);
        if (id !== autoFetchId.current || dirtyRef.current) return;
        const wb = loadWorkbook(buffer);
        setData(wb);
        setDirty(false);
        setLoadedFile(filename);
        setSourceRepoPath(repoPath);
      } catch {
        if (id !== autoFetchId.current) return;
        // Fetch failed — load template, clear stale banner
        setData(getTemplateData(tower, cap));
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
    setData(loadFromLocal(newTower, newCap, release, state) ?? getTemplateData(newTower, newCap));
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
    setData(loadFromLocal(tower, newCap, release, state) ?? getTemplateData(tower, newCap));
    setDirty(false);
    setSaveStatus('idle');
    setLastSaved(getLastSaved(tower, newCap, release, state));
    setLoadedFile(undefined);
    setSourceRepoPath(undefined);
  }, [dirty, tower, release, state]);

  const handleLoadFile = useCallback((buffer: ArrayBuffer) => {
    const wb = loadWorkbook(buffer);
    setData(wb);
    setDirty(false);
  }, []);

  const handleDownload = useCallback(() => {
    const prefix = release === 'All' ? '' : `${release}_`;
    const filename = `${prefix}${state}Flows.xlsx`;
    downloadWorkbook(data, filename);
    setDirty(false);
  }, [release, state, data]);

  const handleTabChange = useCallback((tabName: string, rows: Record<string, unknown>[]) => {
    setData(prev => ({ ...prev, [tabName]: rows }));
    setDirty(true);
    setSaveStatus('idle');
  }, []);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    const ok = saveToLocal(tower, cap, release, state, data);
    if (ok) {
      setSaveStatus('saved');
      setDirty(false);
      setLastSaved(new Date().toISOString());
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('idle');
      alert('Save failed — browser storage may be full.');
    }
  }, [tower, cap, release, state, data]);

  const handlePushToGitHub = useCallback(async () => {
    // Auto-save locally first
    saveToLocal(tower, cap, release, state, data);
    setGithubStatus('pushing');
    setGithubMessage('');
    const result = await saveToGitHub(tower, cap, release, state, data, sourceRepoPath);
    if (result.ok) {
      setGithubStatus('pushed');
      setGithubMessage(result.message);
      setDirty(false);
      setTimeout(() => setGithubStatus('idle'), 4000);
    } else {
      setGithubStatus('error');
      setGithubMessage(result.message);
    }
  }, [tower, cap, release, state, data, sourceRepoPath]);

  const handleTokenModalClose = useCallback(() => {
    setTokenModalOpen(false);
    setHasToken(hasWriteToken());
  }, []);

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
      // Auto-sync release + state from filename
      const info = parseFileInfo(filename);
      setRelease(info.release as Release);
      setState(info.state as FlowState);

      // 1. Check localStorage first
      const local = loadFromLocal(fileTower, capId, info.release, info.state);
      if (local) {
        setData(local);
        setDirty(false);
        setLoadedFile(`${filename} (from saved draft)`);
        setLastSaved(getLastSaved(fileTower, capId, info.release, info.state));
        setSaveStatus('idle');
        return;
      }

      // 2. Try GitHub
      const repoPath = await resolveFilePath(fileTower, capId, filename);
      if (!repoPath) {
        setData(getTemplateData(fileTower, capId));
        setDirty(false);
        setLoadedFile(`${filename} (template — not yet in repo)`);
        setSaveStatus('idle');
        setLastSaved(null);
        return;
      }
      const buffer = await fetchFileContent(repoPath);
      const wb = loadWorkbook(buffer);
      setData(wb);
      setDirty(false);
      setLoadedFile(filename);
      setSourceRepoPath(repoPath);
    } catch (err) {
      // On error, still fall back to template data so user has something
      setData(getTemplateData(fileTower, capId));
      setDirty(false);
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch file');
    } finally {
      setLoadingFile(undefined);
    }
  }, [dirty, tower, cap]);

  const hasData = Object.values(data).some(rows => rows.length > 0);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <img src="favicon.ico" alt="IAO" className="header-logo" />
        <h1>IAO Architecture — Input Portal</h1>
        <span className="header-subtitle">IDM 2.0 Capability Data Editor</span>
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
              onLoadFile={handleLoadFile}
              onSave={handleSave}
              onPushToGitHub={handlePushToGitHub}
              onDownload={handleDownload}
              onOpenTokenSettings={() => setTokenModalOpen(true)}
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
            <TabEditor data={data} onChange={handleTabChange} />
          </div>
        </div>
      </div>

      {/* GitHub token settings modal */}
      <GitHubTokenModal open={tokenModalOpen} onClose={handleTokenModalClose} />
    </div>
  );
}
