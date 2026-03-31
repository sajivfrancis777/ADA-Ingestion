/**
 * AG Grid column definitions for all 8 XLSX tabs.
 * Mirrors the schema from gen_xlsx_templates.py exactly.
 */
import type { ColDef, ColGroupDef } from 'ag-grid-community';

// ─── Reusable cell editors ───────────────────────────────────────
const DIRECTION_VALUES = ['->', '<-', '<->'];
const FREQUENCY_VALUES = ['Real-Time', 'Near Real-Time', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'On-Demand', 'Batch'];
const PRIORITY_VALUES = ['Critical', 'High', 'Medium', 'Low'];

const DATA_CLASS_VALUES = ['Intel Confidential', 'Intel Secret', 'Intel Top Secret', 'Public'];
const MASTER_TXN_VALUES = ['Master', 'Transaction', 'Reference', 'Configuration'];
const AUTH_METHOD_VALUES = ['OAuth', 'NTLM', 'Cert', 'Basic', 'API Key', 'SSO', 'SAML'];
const INTEGRATION_PATTERN_VALUES = ['Pub-Sub', 'Point-to-Point', 'ETL', 'ELT', 'API-Led', 'Event-Driven', 'File-Based', 'Streaming'];
const PROTOCOL_VALUES = ['REST', 'RFC', 'SFTP', 'SOAP', 'OData', 'IDoc', 'BAPI', 'Kafka', 'AMQP', 'gRPC'];
const ENV_VALUES = ['DEV', 'QAS', 'PRD', 'DEV,QAS,PRD', 'Sandbox'];
const INTERFACE_TYPE_VALUES = ['Inbound', 'Outbound', 'Bidirectional'];
const STATUS_VALUES = ['Open', 'In Progress', 'Completed', 'Blocked', 'Deferred'];


function selectEditor(values: string[]): Partial<ColDef> {
  return {
    cellEditor: 'agSelectCellEditor',
    cellEditorParams: { values },
  };
}

const defaultColDef: ColDef = {
  editable: true,
  resizable: true,
  sortable: true,
  filter: true,
  minWidth: 80,
};

// ─── Tab 1: Flows (47 columns, 5 groups) ────────────────────────
const flowsColumns: (ColDef | ColGroupDef)[] = [
  {
    headerName: 'Base',
    marryChildren: true,
    children: [
      { field: 'Flow Chain', width: 160 },
      { field: 'Hop #', width: 70, cellDataType: 'number' },
      { field: 'Source System', width: 160 },
      { field: 'Source Lane', width: 160 },
      { field: 'Target System', width: 160 },
      { field: 'Target Lane', width: 160 },
      { field: 'Interface / Technology', width: 190 },
      { field: 'Direction', width: 90, ...selectEditor(DIRECTION_VALUES) },
      { field: 'Frequency', width: 130, ...selectEditor(FREQUENCY_VALUES) },
      { field: 'Data Description', width: 220 },
      { field: 'Flow Purpose', width: 260 },
      { field: 'Notes / Corrections', width: 220 },
      { field: 'Process/System Owner', width: 180 },
      { field: 'Data Owner', width: 160 },
      { field: 'Applicable Scope', width: 160 },
      { field: 'Src Web Address', width: 190 },
      { field: 'Src Business Owner', width: 160 },
      { field: 'Src Product Owner', width: 160 },
      { field: 'Src Product Owner Email', width: 190 },
      { field: 'Src IAPM URL', width: 260 },
      { field: 'Tgt Web Address', width: 190 },
      { field: 'Tgt Business Owner', width: 160 },
      { field: 'Tgt Product Owner', width: 160 },
      { field: 'Tgt Product Owner Email', width: 190 },
      { field: 'Tgt IAPM URL', width: 260 },
    ],
  },
  {
    headerName: 'Data Architecture',
    marryChildren: true,
    children: [
      { field: 'Data Entity', width: 160 },
      { field: 'Data Format', width: 130 },
      { field: 'Data Classification', width: 160, ...selectEditor(DATA_CLASS_VALUES) },
      { field: 'Data Volume', width: 130 },
      { field: 'Master/Transaction', width: 160, ...selectEditor(MASTER_TXN_VALUES) },
      { field: 'Data Lineage Notes', width: 220 },
    ],
  },
  {
    headerName: 'Technology Architecture',
    marryChildren: true,
    children: [
      { field: 'Integration Pattern', width: 160, ...selectEditor(INTEGRATION_PATTERN_VALUES) },
      { field: 'Middleware / Platform', width: 180 },
      { field: 'Protocol', width: 130, ...selectEditor(PROTOCOL_VALUES) },
      { field: 'Auth Method', width: 130, ...selectEditor(AUTH_METHOD_VALUES) },
      { field: 'Environment Scope', width: 140, ...selectEditor(ENV_VALUES) },
      { field: 'SLA / Latency', width: 130 },
    ],
  },
  {
    headerName: 'Interface Architecture',
    marryChildren: true,
    children: [
      { field: 'Interface ID', width: 130 },
      { field: 'Interface Type', width: 130, ...selectEditor(INTERFACE_TYPE_VALUES) },
      { field: 'Error Handling', width: 160 },
      { field: 'Monitoring', width: 130 },
    ],
  },
  {
    headerName: 'Endpoint Details',
    marryChildren: true,
    children: [
      { field: 'Source DB Platform', width: 160 },
      { field: 'Target DB Platform', width: 160 },
      { field: 'Source Schema/Object', width: 180 },
      { field: 'Target Schema/Object', width: 180 },
      { field: 'Source Tech Platform', width: 160 },
      { field: 'Target Tech Platform', width: 160 },
    ],
  },
];

// ─── Tab 2: Business Drivers ─────────────────────────────────────
const businessDriversColumns: ColDef[] = [
  { field: 'Driver #', width: 90, cellDataType: 'number' },
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
  { field: '#', width: 60, cellDataType: 'number' },
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
