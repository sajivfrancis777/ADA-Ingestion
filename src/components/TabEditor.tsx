/**
 * TabEditor — 6-tab ribbon editor using AG Grid Community.
 * Each tab maps to one XLSX worksheet with its own column definitions.
 * Excel-like UX: compact rows, row numbers, clipboard paste, visible grid lines,
 * checkbox multi-select, Ctrl+C/V/X/A/Delete support.
 */
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeLightCold } from 'ag-grid-community';
import { TAB_DEFINITIONS, defaultColDef } from '../grids/columnDefs';
import { useGridClipboard } from '../hooks/useGridClipboard';
import type { GridClipboardEvent } from '../hooks/useGridClipboard';
import type { WorkbookData } from '../utils/xlsxUtils';
import type { ColDef, ColGroupDef, CellValueChangedEvent, GridReadyEvent, GetMainMenuItemsParams } from 'ag-grid-community';

/** Custom Excel-like theme: compact rows, visible borders */
const excelTheme = themeQuartz.withPart(colorSchemeLightCold).withParams({
  rowHeight: 28,
  headerHeight: 32,
  fontSize: 13,
  borderColor: '#c8d6e5',
  headerBackgroundColor: '#dfe6ed',
  headerTextColor: '#2c3e50',
  oddRowBackgroundColor: '#ffffff',
  rowBorder: true,
  columnBorder: true,
  wrapperBorder: true,
  headerColumnBorder: true,
  cellHorizontalPadding: 6,
});

/** Number of pre-populated empty rows per tab (lets users paste directly). */
const DEFAULT_EMPTY_ROWS = 50;

interface TabEditorProps {
  data: WorkbookData;
  onChange: (tabName: string, rows: Record<string, unknown>[]) => void;
}

export default function TabEditor({ data, onChange }: TabEditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const gridRef = useRef<AgGridReact>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tab = TAB_DEFINITIONS[activeTab];
  const rawData = data[tab.name] ?? [];

  // ── Break the edit feedback loop ──────────────────────────────
  // AG Grid is self-mutating: edits modify node.data in-place.
  // If we feed edited rows back through the rowData prop, AG Grid
  // does a full row replacement (no getRowId) and can discard
  // in-flight edits.  Fix: track the last array WE sent to the
  // parent so we can skip the reactive update when it echoes back.
  const lastSentRef = useRef<Record<string, unknown>[]>();
  const [gridRowData, setGridRowData] = useState<Record<string, unknown>[]>(() =>
    rawData.length > 0 ? rawData : Array.from({ length: DEFAULT_EMPTY_ROWS }, () => ({} as Record<string, unknown>))
  );

  // Only push new data to the grid for EXTERNAL changes (tab switch,
  // file load, tower change) — NOT for our own edit notifications.
  useEffect(() => {
    if (rawData === lastSentRef.current) return; // echo from our own edit — skip
    setGridRowData(
      rawData.length > 0
        ? rawData
        : Array.from({ length: DEFAULT_EMPTY_ROWS }, () => ({} as Record<string, unknown>))
    );
  }, [rawData]);

  /** Row number column (pinned left, non-editable) + checkbox selection */
  const leadColumns: ColDef[] = useMemo(() => [
    {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      headerName: '',
      width: 42,
      minWidth: 42,
      maxWidth: 42,
      pinned: 'left',
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      lockPosition: 'left',
      suppressMovable: true,
    },
    {
      headerName: '#',
      width: 52,
      minWidth: 52,
      maxWidth: 70,
      pinned: 'left',
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      lockPosition: 'left',
      suppressMovable: true,
      valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
      cellStyle: { color: '#999', textAlign: 'center', fontWeight: 500 },
    },
  ], []);

  const fullColumns = useMemo(() => [
    ...leadColumns,
    ...(tab.columns as (ColDef | ColGroupDef)[]),
  ], [leadColumns, tab.columns]);

  const notifyParent = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const rows: Record<string, unknown>[] = [];
    api.forEachNode(node => {
      if (node.data) rows.push({ ...node.data });
    });
    lastSentRef.current = rows;   // tag so the echo is skipped in useEffect
    onChange(tab.name, rows);
  }, [tab.name, onChange]);

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const handleClipboardEvent = useCallback((evt: GridClipboardEvent) => {
    const labels: Record<string, string> = {
      'copy': '📋 Copied', 'cut': '✂️ Cut', 'paste': '📥 Pasted',
      'delete': '🗑️ Cleared', 'select-all': '☑️ Selected',
    };
    const label = labels[evt.action] ?? evt.action;
    showToast(`${label} ${evt.rows} row${evt.rows !== 1 ? 's' : ''} × ${evt.cols} column${evt.cols !== 1 ? 's' : ''}`);
  }, [showToast]);

  // Wire up custom clipboard (Ctrl+C/V/X, Delete, Ctrl+A)
  useGridClipboard({
    api: gridRef.current?.api ?? null,
    containerRef,
    columns: tab.columns as (ColDef | ColGroupDef)[],
    onDataChanged: notifyParent,
    onClipboardEvent: handleClipboardEvent,
  });

  const addRow = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.applyTransaction({ add: [{}] });
    notifyParent();
  }, [notifyParent]);

  const autoSizeColumns = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.autoSizeAllColumns();
  }, []);

  const clearColumn = useCallback((field: string) => {
    const api = gridRef.current?.api;
    if (!api) return;
    let count = 0;
    api.forEachNode(node => {
      if (node.data && node.data[field] !== undefined && node.data[field] !== '') {
        node.data[field] = '';
        count++;
      }
    });
    if (count > 0) {
      api.refreshCells({ force: true });
      notifyParent();
    }
  }, [notifyParent]);

  const getMainMenuItems = useCallback((params: GetMainMenuItemsParams) => {
    const field = params.column?.getColDef()?.field;
    const defaults = params.defaultItems || [];
    if (!field) return defaults;
    return [
      ...defaults,
      'separator',
      {
        name: `Clear all "${field}" values`,
        action: () => clearColumn(field),
        icon: '<span style="font-size:14px">🗑️</span>',
      },
    ];
  }, [clearColumn]);

  // Custom right-click context menu (AG Grid Community doesn't have built-in)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; field: string } | null>(null);

  const handleCellContextMenu = useCallback((e: React.MouseEvent) => {
    const cell = (e.target as HTMLElement).closest('.ag-cell');
    if (!cell) return;
    const colId = cell.getAttribute('col-id');
    if (!colId) return;
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, field: colId });
  }, []);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [ctxMenu]);

  const deleteSelectedRows = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const selected = api.getSelectedRows();
    if (selected.length === 0) return;
    api.applyTransaction({ remove: selected });
    notifyParent();
  }, [notifyParent]);

  const onGridReady = useCallback((_e: GridReadyEvent) => {
    // Auto-size all columns to fit their content width
    setTimeout(() => _e.api.autoSizeAllColumns(), 0);
  }, []);

  // Auto-size columns when switching tabs (grid instance stays alive)
  useEffect(() => {
    const api = gridRef.current?.api;
    if (api) {
      setTimeout(() => api.autoSizeAllColumns(), 0);
    }
  }, [activeTab]);

  // Count real (non-empty) rows for display
  const realRowCount = rawData.length;

  return (
    <div className="tab-editor" ref={containerRef} tabIndex={0}>
      {/* Clipboard toast */}
      {toast && <div className="clipboard-toast">{toast}</div>}

      {/* Tab ribbon */}
      <div className="tab-ribbon">
        {TAB_DEFINITIONS.map((t, i) => (
          <button
            key={t.name}
            className={`tab-btn ${i === activeTab ? 'active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {t.name}
            {(data[t.name]?.length ?? 0) > 0 && (
              <span className="tab-count">{data[t.name].length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Row actions toolbar */}
      <div className="row-toolbar">
        <button className="btn btn-add" onClick={addRow}>+ Add Row</button>
        <button className="btn btn-delete" onClick={deleteSelectedRows}>Delete Selected</button>
        <button className="btn btn-auto" onClick={autoSizeColumns} title="Auto-size all columns to fit content">↔ Auto-size Columns</button>
        <span className="clipboard-hint">
          Ctrl+C Copy &nbsp;|&nbsp; Ctrl+V Paste &nbsp;|&nbsp; Ctrl+X Cut &nbsp;|&nbsp; Ctrl+A Select All &nbsp;|&nbsp; Del Clear
        </span>
        <span className="row-info">
          {realRowCount > 0 ? `${realRowCount} rows` : `${DEFAULT_EMPTY_ROWS} empty rows`} in {tab.name}
        </span>
      </div>

      {/* AG Grid — Excel-like.  Single instance kept alive across tabs;
          columnDefs + rowData swap via React props (no destroy/recreate). */}
      <div className="grid-container" onContextMenu={handleCellContextMenu}>
        <AgGridReact
          ref={gridRef}
          theme={excelTheme}
          columnDefs={fullColumns}
          defaultColDef={defaultColDef}
          rowData={gridRowData}
          rowSelection="multiple"
          onCellValueChanged={(_e: CellValueChangedEvent) => notifyParent()}
          onGridReady={onGridReady}
          singleClickEdit={true}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          enableCellTextSelection={true}
          suppressRowClickSelection={true}
          getMainMenuItems={getMainMenuItems}
        />

        {/* Custom right-click context menu */}
        {ctxMenu && (
          <div
            className="ctx-menu"
            style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, zIndex: 9999 }}
          >
            <button onClick={() => { clearColumn(ctxMenu.field); setCtxMenu(null); }}>
              {'\ud83d\uddd1\ufe0f'} Clear all &quot;{ctxMenu.field}&quot; values
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
