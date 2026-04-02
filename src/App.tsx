/**
 * IAO Architecture Input Portal — Main Application
 *
 * Provides tower/capability/release/state selectors, 6-tab AG Grid editor,
 * and XLSX load/download via SheetJS.
 * Pre-loads DS-020 template data for ALL capabilities as a gold standard
 * that architects can overwrite with their own data.
 */
import { useState, useCallback } from 'react';
import TowerSelector from './components/TowerSelector';
import Toolbar from './components/Toolbar';
import TabEditor from './components/TabEditor';
import { TOWERS, CAPABILITIES } from './data/towerRegistry';
import { loadWorkbook, downloadWorkbook, createBlankWorkbook } from './utils/xlsxUtils';
import type { WorkbookData } from './utils/xlsxUtils';
import type { Release, FlowState } from './components/TowerSelector';
import ds020Sample from './data/ds020_sample.json';

/** Load DS-020 template data as starting point for any capability. */
function getTemplateData(): WorkbookData {
  const blank = createBlankWorkbook();
  const sample = ds020Sample as Record<string, Record<string, unknown>[]>;
  for (const key of Object.keys(blank)) {
    if (sample[key] && sample[key].length > 0) {
      blank[key] = sample[key];
    }
  }
  return blank;
}

export default function App() {
  const [tower, setTower] = useState(TOWERS[0].id);
  const firstCap = CAPABILITIES[TOWERS[0].id]?.[0]?.id ?? '';
  const [cap, setCap] = useState(firstCap);
  const [release, setRelease] = useState<Release>('All');
  const [state, setState] = useState<FlowState>('Current');
  // Pre-load DS-020 template data for all capabilities
  const [data, setData] = useState<WorkbookData>(getTemplateData);
  const [dirty, setDirty] = useState(false);

  const handleTowerChange = useCallback((newTower: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch tower? Changes will be lost.')) {
      return;
    }
    setTower(newTower);
    const newCaps = CAPABILITIES[newTower] ?? [];
    if (newCaps.length > 0) setCap(newCaps[0].id);
    setData(getTemplateData());
    setDirty(false);
  }, [dirty]);

  const handleCapChange = useCallback((newCap: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch capability? Changes will be lost.')) {
      return;
    }
    setCap(newCap);
    setData(getTemplateData());
    setDirty(false);
  }, [dirty]);

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
  }, []);

  const hasData = Object.values(data).some(rows => rows.length > 0);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <h1>IAO Architecture — Input Portal</h1>
        <span className="header-subtitle">IDM 2.0 Capability Data Editor</span>
      </header>

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
          onLoadFile={handleLoadFile}
          onDownload={handleDownload}
        />
      </div>

      {/* Dirty indicator */}
      {dirty && (
        <div className="dirty-banner">
          Unsaved changes — click <strong>Download XLSX</strong> to save
        </div>
      )}

      {/* Embedded sheet editor */}
      <div className="sheet-frame">
        <TabEditor data={data} onChange={handleTabChange} />
      </div>
    </div>
  );
}
