/**
 * TabEditor — 6-tab ribbon editor using AG Grid Community.
 * Each tab maps to one XLSX worksheet with its own column definitions.
 * Excel-like UX: compact rows, row numbers, clipboard paste, visible grid lines,
 * checkbox multi-select, Ctrl+C/V/X/A/Delete support.
 */
import { useState, useCallback, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeLightCold } from 'ag-grid-community';
import { TAB_DEFINITIONS, defaultColDef } from '../grids/columnDefs';
import { useGridClipboard } from '../hooks/useGridClipboard';
import type { WorkbookData } from '../utils/xlsxUtils';
import type { ColDef, ColGroupDef, CellValueChangedEvent, GridReadyEvent } from 'ag-grid-community';

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
  const gridRef = useRef<AgGridReact>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const tab = TAB_DEFINITIONS[activeTab];
  const rawData = data[tab.name] ?? [];

  // If tab is empty, pre-fill with empty rows so users can highlight row 1 and paste
  const rowData = useMemo(() => {
    if (rawData.length > 0) return rawData;
    return Array.from({ length: DEFAULT_EMPTY_ROWS }, () => ({} as Record<string, unknown>));
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
    onChange(tab.name, rows);
  }, [tab.name, onChange]);

  // Wire up custom clipboard (Ctrl+C/V/X, Delete, Ctrl+A)
  useGridClipboard({
    api: gridRef.current?.api ?? null,
    containerRef,
    columns: tab.columns as (ColDef | ColGroupDef)[],
    onDataChanged: notifyParent,
  });

  const addRow = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.applyTransaction({ add: [{}] });
    notifyParent();
  }, [notifyParent]);

  const deleteSelectedRows = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const selected = api.getSelectedRows();
    if (selected.length === 0) return;
    api.applyTransaction({ remove: selected });
    notifyParent();
  }, [notifyParent]);

  const onGridReady = useCallback((_e: GridReadyEvent) => {
    // Auto-size columns to fit content on first render
    _e.api.sizeColumnsToFit();
  }, []);

  // Count real (non-empty) rows for display
  const realRowCount = rawData.length;

  return (
    <div className="tab-editor" ref={containerRef} tabIndex={0}>
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
        <span className="clipboard-hint">
          Ctrl+C Copy &nbsp;|&nbsp; Ctrl+V Paste &nbsp;|&nbsp; Ctrl+X Cut &nbsp;|&nbsp; Ctrl+A Select All &nbsp;|&nbsp; Del Clear
        </span>
        <span className="row-info">
          {realRowCount > 0 ? `${realRowCount} rows` : `${DEFAULT_EMPTY_ROWS} empty rows`} in {tab.name}
        </span>
      </div>

      {/* AG Grid — Excel-like */}
      <div className="grid-container">
        <AgGridReact
          ref={gridRef}
          theme={excelTheme}
          key={tab.name}
          columnDefs={fullColumns}
          defaultColDef={defaultColDef}
          rowData={rowData}
          rowSelection="multiple"
          onCellValueChanged={(_e: CellValueChangedEvent) => notifyParent()}
          onGridReady={onGridReady}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          enableCellTextSelection={true}
          suppressRowClickSelection={true}
        />
      </div>
    </div>
  );
}
