/**
 * SheetJS (xlsx) utilities for loading and downloading XLSX workbooks.
 * Handles the conversion between AG Grid row data and Excel worksheets.
 */
import * as XLSX from 'xlsx';
import { TAB_DEFINITIONS } from '../grids/columnDefs';
import type { ColDef, ColGroupDef } from 'ag-grid-community';

/** All tab data keyed by tab name */
export type WorkbookData = Record<string, Record<string, unknown>[]>;

/**
 * Extract flat field names from column definitions (handles grouped columns).
 */
function getFieldNames(columns: (ColDef | ColGroupDef)[]): string[] {
  const fields: string[] = [];
  for (const col of columns) {
    if ('children' in col && col.children) {
      fields.push(...getFieldNames(col.children as (ColDef | ColGroupDef)[]));
    } else if ('field' in col && col.field) {
      fields.push(col.field);
    }
  }
  return fields;
}

/**
 * Load an XLSX file (from File input or ArrayBuffer) into WorkbookData.
 * Reads all 8 tabs, falling back to empty arrays for missing tabs.
 */
export function loadWorkbook(data: ArrayBuffer): WorkbookData {
  const wb = XLSX.read(data, { type: 'array' });
  const result: WorkbookData = {};

  for (const tab of TAB_DEFINITIONS) {
    const ws = wb.Sheets[tab.name];
    if (ws) {
      // Read as JSON, skip hint row (row 2) if it looks like hint data
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      // Filter out the hint row (row 2 in Excel = first data row in JSON)
      // Hint rows have italic gray text like "e.g. ..." — detect by checking first cell
      const fields = getFieldNames(tab.columns);
      const filtered = rows.filter(row => {
        const firstVal = String(row[fields[0]] ?? '');
        return !firstVal.startsWith('e.g.');
      });
      // Coerce numeric-looking strings to actual numbers (fixes "Invalid Number" in AG Grid)
      const coerced = filtered.map(row => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) {
            out[k] = Number(v);
          } else {
            out[k] = v;
          }
        }
        return out;
      });
      result[tab.name] = coerced;
    } else {
      result[tab.name] = [];
    }
  }

  return result;
}

/**
 * Build an XLSX workbook object from WorkbookData.
 * Shared by downloadWorkbook() and workbookToXlsxBase64().
 */
function buildXlsxWorkbook(data: WorkbookData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  for (const tab of TAB_DEFINITIONS) {
    const fields = getFieldNames(tab.columns);
    const rows = data[tab.name] ?? [];

    // Create worksheet from JSON with explicit header order
    const ws = XLSX.utils.json_to_sheet(rows, { header: fields });

    // Set column widths to match our template
    ws['!cols'] = fields.map(f => ({ wch: Math.max(f.length, 12) }));

    XLSX.utils.book_append_sheet(wb, ws, tab.name);
  }
  return wb;
}

/**
 * Convert WorkbookData into an XLSX file and trigger browser download.
 */
export function downloadWorkbook(data: WorkbookData, filename: string): void {
  XLSX.writeFile(buildXlsxWorkbook(data), filename);
}

/**
 * Convert WorkbookData to base64-encoded XLSX binary.
 * Used by githubSave to write XLSX directly to the Architecture repo.
 */
export function workbookToXlsxBase64(data: WorkbookData): string {
  return XLSX.write(buildXlsxWorkbook(data), { type: 'base64', bookType: 'xlsx' });
}

/**
 * Create a blank WorkbookData with empty rows for all tabs.
 */
export function createBlankWorkbook(): WorkbookData {
  const result: WorkbookData = {};
  for (const tab of TAB_DEFINITIONS) {
    result[tab.name] = [];
  }
  return result;
}
