/**
 * AG Grid column definitions for all tabs.
 * Flows tab uses simplified 14-column layout — enrichment fills the rest.
 */
import type { ColDef, ColGroupDef, ValueSetterParams } from 'ag-grid-community';
import AutocompleteCellEditor from './AutocompleteCellEditor';
import InlineSelectRenderer from './InlineSelectRenderer';
import { ALL_SYSTEMS, DB_OPTIONS, PLATFORM_OPTIONS, SYSTEM_DEFAULTS } from '../data/systemRegistry';

// ─── Reusable cell editors ───────────────────────────────────────
const FREQUENCY_VALUES = ['Real-Time', 'Near Real-Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'On-Demand', 'Batch'];
const PRIORITY_VALUES = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_VALUES = ['Open', 'In Progress', 'Completed', 'Blocked', 'Deferred'];

// Simplified Flows dropdowns (14-column input — enrichment script fills the rest)
const INTERFACE_VALUES = ['IDoc', 'RFC', 'BAPI', 'REST API', 'OData', 'SOAP', 'SFTP', 'File', 'CPI', 'PI/PO', 'MuleSoft', 'Kafka', 'DB Link', 'Manual', 'Other'];
const DB_PLATFORM_VALUES = DB_OPTIONS;
const TECH_PLATFORM_VALUES = PLATFORM_OPTIONS;
const INTEGRATION_PATTERN_VALUES = ['Point-to-Point', 'Hub-Spoke', 'Publish-Subscribe', 'Batch File', 'API Gateway', 'Database Link'];

/**
 * Auto-fill helper: when Source/Target System is selected and the DB Platform
 * and Tech Platform cells are still empty, pre-fill them from SYSTEM_DEFAULTS.
 */
function systemAutoFillSetter(dbField: string, platField: string) {
  return (params: ValueSetterParams) => {
    const field = params.colDef.field;
    if (!field) return false;
    params.data[field] = params.newValue;
    const sys = String(params.newValue || '');
    const defaults = (SYSTEM_DEFAULTS as Record<string, { db: string; platform: string }>)[sys];
    if (defaults) {
      if (!params.data[dbField]) params.data[dbField] = defaults.db;
      if (!params.data[platField]) params.data[platField] = defaults.platform;
    }
    // Refresh auto-filled neighbor cells so the UI shows new values immediately
    if (defaults && params.api) {
      const cols = [dbField, platField];
      setTimeout(() => params.api.refreshCells({ columns: cols }), 0);
    }
    return true;
  };
}


/** Inline <select> in cell — bypasses AG Grid's editor lifecycle entirely. */
function selectEditor(values: string[]): Partial<ColDef> {
  return {
    editable: false,  // Disable AG Grid's editor — we use a cellRenderer instead
    cellRenderer: InlineSelectRenderer,
    cellRendererParams: { values },
  };
}

/** Numeric column: coerce string values from SheetJS to numbers on display. */
function numericCol(): Partial<ColDef> {
  return {
    valueFormatter: (p) => {
      if (p.value == null || p.value === '') return '';
      const n = Number(p.value);
      return isNaN(n) ? String(p.value) : String(n);
    },
    valueParser: (p) => {
      if (p.newValue == null || p.newValue === '') return null;
      const n = Number(p.newValue);
      return isNaN(n) ? p.newValue : n;
    },
  };
}

const defaultColDef: ColDef = {
  editable: true,
  resizable: true,
  sortable: true,
  filter: true,
  minWidth: 60,
  wrapHeaderText: true,
  autoHeaderHeight: true,
};

// ─── Tab 1: Flows (14 simplified columns — enrichment fills the rest) ──
const flowsColumns: (ColDef | ColGroupDef)[] = [
  {
    headerName: 'Flow Identification',
    marryChildren: true,
    children: [
      { field: 'Flow Chain', width: 200 },
      { field: 'Hop #', width: 80, ...numericCol() },
    ],
  },
  {
    headerName: 'Application Architecture',
    marryChildren: true,
    children: [
      // AutocompleteCellEditor with isPopup()=true prevents stopEditingWhenCellsLoseFocus race
      { field: 'Source System', width: 180, cellEditor: AutocompleteCellEditor, cellEditorParams: { values: ALL_SYSTEMS }, valueSetter: systemAutoFillSetter('Source DB Platform', 'Source Tech Platform') },
      { field: 'Source Lane', width: 160 },
      { field: 'Target System', width: 180, cellEditor: AutocompleteCellEditor, cellEditorParams: { values: ALL_SYSTEMS }, valueSetter: systemAutoFillSetter('Target DB Platform', 'Target Tech Platform') },
      { field: 'Target Lane', width: 160 },
      { field: 'Interface / Technology', width: 180, ...selectEditor(INTERFACE_VALUES) },
      { field: 'Frequency', width: 140, ...selectEditor(FREQUENCY_VALUES) },
      { field: 'Data Description', width: 280 },
    ],
  },
  {
    headerName: 'Data Architecture',
    marryChildren: true,
    children: [
      { field: 'Source DB Platform', width: 160, ...selectEditor(DB_PLATFORM_VALUES) },
      { field: 'Target DB Platform', width: 160, ...selectEditor(DB_PLATFORM_VALUES) },
    ],
  },
  {
    headerName: 'Technology Architecture (optional — auto-filled if blank)',
    marryChildren: true,
    children: [
      { field: 'Source Tech Platform', width: 180, ...selectEditor(TECH_PLATFORM_VALUES) },
      { field: 'Target Tech Platform', width: 180, ...selectEditor(TECH_PLATFORM_VALUES) },
      { field: 'Integration Pattern', width: 160, ...selectEditor(INTEGRATION_PATTERN_VALUES) },
    ],
  },
];

// ─── Tab 2: Business Drivers ─────────────────────────────────────
const businessDriversColumns: ColDef[] = [
  { field: 'Driver #', width: 90, ...numericCol() },
  { field: 'Driver Name', width: 220 },
  { field: 'Description', width: 400, cellEditor: 'agLargeTextCellEditor' },
  { field: 'Strategic Alignment', width: 260 },
  { field: 'Priority', width: 110, ...selectEditor(PRIORITY_VALUES) },
];

// ─── Tab 3: Success Criteria ─────────────────────────────────────
const successCriteriaColumns: ColDef[] = [
  { field: 'Metric', width: 220 },
  { field: 'Target', width: 180 },
  { field: 'Measure', width: 220 },
  { field: 'Baseline', width: 180 },
  { field: 'Owner', width: 180 },
];



// ─── Tab 5: NFRs ─────────────────────────────────────────────────
const nfrsColumns: ColDef[] = [
  { field: 'Category', width: 160 },
  { field: 'Requirement', width: 350, cellEditor: 'agLargeTextCellEditor' },
  { field: 'Target / SLA', width: 180 },
  { field: 'Priority', width: 110, ...selectEditor(PRIORITY_VALUES) },
  { field: 'Notes', width: 260, cellEditor: 'agLargeTextCellEditor' },
];

// ─── Tab 6: Security Controls ────────────────────────────────────
const securityColumns: ColDef[] = [
  { field: 'Concern', width: 180 },
  { field: 'Approach', width: 300, cellEditor: 'agLargeTextCellEditor' },
  { field: 'Standard / Policy', width: 220 },
  { field: 'Owner', width: 180 },
  { field: 'Notes', width: 260, cellEditor: 'agLargeTextCellEditor' },
];



// ─── Tab 8: Recommendations ─────────────────────────────────────
const recommendationsColumns: ColDef[] = [
  { field: '#', width: 60, ...numericCol() },
  { field: 'Category', width: 160 },
  { field: 'Recommendation', width: 400, cellEditor: 'agLargeTextCellEditor' },
  { field: 'Priority', width: 110, ...selectEditor(PRIORITY_VALUES) },
  { field: 'Owner', width: 180 },
  { field: 'Target Date', width: 130 },
  { field: 'Status', width: 130, ...selectEditor(STATUS_VALUES) },
];

// ─── Exports ─────────────────────────────────────────────────────

export interface TabDefinition {
  name: string;
  columns: (ColDef | ColGroupDef)[];
}

export const TAB_DEFINITIONS: TabDefinition[] = [
  { name: 'Flows', columns: flowsColumns },
  { name: 'Business Drivers', columns: businessDriversColumns },
  { name: 'Success Criteria', columns: successCriteriaColumns },
  { name: 'NFRs', columns: nfrsColumns },
  { name: 'Security Controls', columns: securityColumns },
  { name: 'Recommendations', columns: recommendationsColumns },
];

export { defaultColDef };
