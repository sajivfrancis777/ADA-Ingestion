/**
 * TabEditor — 6-tab ribbon editor using AG Grid Community.
 * Each tab maps to one XLSX worksheet with its own column definitions.
 * Excel-like UX: compact rows, row numbers, clipboard paste, visible grid lines.
 */
import { useState, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { themeQuartz, colorSchemeLightCold } from 'ag-grid-community';
import { TAB_DEFINITIONS, defaultColDef } from '../grids/columnDefs';
import type { WorkbookData } from '../utils/xlsxUtils';
import type { ColDef, ColGroupDef, CellValueChangedEvent } from 'ag-grid-community';

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

interface TabEditorProps {
  data: WorkbookData;
  onChange: (tabName: string, rows: Record<string, unknown>[]) => void;
}

export default function TabEditor({ data, onChange }: TabEditorProps) {
  const [activeTab, setActiveTab] = useState(0);
  const gridRef = useRef<AgGridReact>(null);

  const tab = TAB_DEFINITIONS[activeTab];
  const rowData = data[tab.name] ?? [];

  const onCellValueChanged = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const rows: Record<string, unknown>[] = [];
    api.forEachNode(node => {
      if (node.data) rows.push({ ...node.data });
    });
    onChange(tab.name, rows);
  }, [tab.name, onChange]);

  const addRow = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const emptyRow: Record<string, unknown> = {};
    api.applyTransaction({ add: [emptyRow] });
    // Notify parent
    const rows: Record<string, unknown>[] = [];
    api.forEachNode(node => {
      if (node.data) rows.push({ ...node.data });
    });
    onChange(tab.name, rows);
  }, [tab.name, onChange]);

  const deleteSelectedRows = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const selected = api.getSelectedRows();
    if (selected.length === 0) return;
    api.applyTransaction({ remove: selected });
    const rows: Record<string, unknown>[] = [];
    api.forEachNode(node => {
      if (node.data) rows.push({ ...node.data });
    });
    onChange(tab.name, rows);
  }, [tab.name, onChange]);

  return (
    <div className="tab-editor">
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
        <span className="row-info">
          {rowData.length} row{rowData.length !== 1 ? 's' : ''} in {tab.name}
        </span>
      </div>

      {/* AG Grid — Excel-like */}
      <div className="grid-container">
        <AgGridReact
          ref={gridRef}
          theme={excelTheme}
          key={tab.name}
          columnDefs={tab.columns as (ColDef | ColGroupDef)[]}
          defaultColDef={defaultColDef}
          rowData={rowData}
          rowSelection="multiple"
          onCellValueChanged={(_e: CellValueChangedEvent) => onCellValueChanged()}
          undoRedoCellEditing={true}
          undoRedoCellEditingLimit={20}
          enableCellTextSelection={true}
          suppressRowClickSelection={true}
          clipboardDelimiter="\t"
        />
      </div>
    </div>
  );
}
