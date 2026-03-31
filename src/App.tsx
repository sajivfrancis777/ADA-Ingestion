/**
 * IAO Architecture Input Portal — Main Application
 *
 * Provides a tower/capability selector, 8-tab AG Grid editor,
 * and XLSX load/download via SheetJS.
 */
import { useState, useCallback } from 'react';
import TowerSelector from './components/TowerSelector';
import Toolbar from './components/Toolbar';
import TabEditor from './components/TabEditor';
import { TOWERS, CAPABILITIES } from './data/towerRegistry';
import { loadWorkbook, downloadWorkbook, createBlankWorkbook } from './utils/xlsxUtils';
import type { WorkbookData } from './utils/xlsxUtils';

export default function App() {
  const [tower, setTower] = useState(TOWERS[0].id);
  const firstCap = CAPABILITIES[TOWERS[0].id]?.[0]?.id ?? '';
  const [cap, setCap] = useState(firstCap);
  const [data, setData] = useState<WorkbookData>(createBlankWorkbook);
  const [dirty, setDirty] = useState(false);

  const handleTowerChange = useCallback((newTower: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch tower? Changes will be lost.')) {
      return;
    }
    setTower(newTower);
    const newCaps = CAPABILITIES[newTower] ?? [];
    if (newCaps.length > 0) setCap(newCaps[0].id);
    setData(createBlankWorkbook());
    setDirty(false);
  }, [dirty]);

  const handleCapChange = useCallback((newCap: string) => {
    if (dirty && !window.confirm('You have unsaved changes. Switch capability? Changes will be lost.')) {
      return;
    }
    setCap(newCap);
    setData(createBlankWorkbook());
    setDirty(false);
  }, [dirty]);

  const handleLoadFile = useCallback((buffer: ArrayBuffer) => {
    const wb = loadWorkbook(buffer);
    setData(wb);
    setDirty(false);
  }, []);

  const handleDownload = useCallback(() => {
    const filename = `${tower}_${cap}_CurrentFlows.xlsx`;
    downloadWorkbook(data, filename);
    setDirty(false);
  }, [tower, cap, data]);

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

      {/* Tower / Capability selector + file toolbar */}
      <div className="app-controls">
        <TowerSelector
          selectedTower={tower}
          selectedCap={cap}
          onTowerChange={handleTowerChange}
          onCapChange={handleCapChange}
        />
        <Toolbar
          tower={tower}
          cap={cap}
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

      {/* 8-tab AG Grid editor */}
      <TabEditor data={data} onChange={handleTabChange} />
    </div>
  );
}
