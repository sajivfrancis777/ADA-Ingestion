/**
 * AG Grid column definitions for all tabs.
 * Flows tab uses simplified 14-column layout — enrichment fills the rest.
 */
import type { ColDef, ColGroupDef } from 'ag-grid-community';
import AutocompleteCellEditor from './AutocompleteCellEditor';
import { ALL_SYSTEMS } from '../data/systemRegistry';

// ─── Reusable cell editors ───────────────────────────────────────
const FREQUENCY_VALUES = ['Real-Time', 'Near Real-Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'On-Demand', 'Batch'];
const PRIORITY_VALUES = ['Critical', 'High', 'Medium', 'Low'];
const STATUS_VALUES = ['Open', 'In Progress', 'Completed', 'Blocked', 'Deferred'];

// Simplified Flows dropdowns (14-column input — enrichment script fills the rest)
const INTERFACE_VALUES = ['IDoc', 'RFC', 'BAPI', 'REST API', 'OData', 'SOAP', 'SFTP', 'File', 'CPI', 'PI/PO', 'MuleSoft', 'Kafka', 'DB Link', 'Manual', 'Other'];
const DB_PLATFORM_VALUES = ['SAP HANA', 'Oracle', 'SQL Server', 'PostgreSQL', 'MongoDB', 'Snowflake', 'Teradata', 'DB2', 'MySQL', 'Azure SQL', 'Other'];
const TECH_PLATFORM_VALUES = ['SAP HANA (On-Premise)', 'SAP BTP (Cloud)', 'Azure (Cloud)', 'AWS (Cloud)', 'On-Premise', 'Kubernetes', 'Other'];
const INTEGRATION_PATTERN_VALUES = ['Point-to-Point', 'Hub-Spoke', 'Publish-Subscribe', 'Batch File', 'API Gateway', 'Database Link'];


function selectEditor(values: string[]): Partial<ColDef> {
  return {
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values },
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
      { field: 'Source System', width: 180, cellEditor: AutocompleteCellEditor, cellEditorParams: { values: ALL_SYSTEMS }, cellEditorPopup: true },
      { field: 'Source Lane', width: 160 },
      { field: 'Target System', width: 180, cellEditor: AutocompleteCellEditor, cellEditorParams: { values: ALL_SYSTEMS }, cellEditorPopup: true },
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
