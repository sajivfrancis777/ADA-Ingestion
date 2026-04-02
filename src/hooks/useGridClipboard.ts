/**
 * useGridClipboard — Custom clipboard handler for AG Grid Community.
 *
 * AG Grid Community does NOT include ClipboardModule (Enterprise only).
 * This hook adds Excel-like keyboard shortcuts:
 *   Ctrl+C  — copy selected cells / rows as TSV
 *   Ctrl+V  — paste TSV from system clipboard into grid starting at focused cell
 *   Ctrl+X  — cut (copy + clear)
 *   Delete  — clear selected cells
 *   Ctrl+A  — select all rows
 */
import { useEffect, useCallback } from 'react';
import type { GridApi, ColDef, ColGroupDef } from 'ag-grid-community';

/** Extract flat field names from columns (handles grouped columns). */
function getFields(columns: (ColDef | ColGroupDef)[]): string[] {
  const fields: string[] = [];
  for (const col of columns) {
    if ('children' in col && col.children) {
      fields.push(...getFields(col.children as (ColDef | ColGroupDef)[]));
    } else if ('field' in col && col.field) {
      fields.push(col.field);
    }
  }
  return fields;
}

/** Build TSV string from selected rows. */
function rowsToTsv(rows: Record<string, unknown>[], fields: string[]): string {
  const header = fields.join('\t');
  const dataLines = rows.map(row => fields.map(f => String(row[f] ?? '')).join('\t'));
  return [header, ...dataLines].join('\n');
}

/** Parse TSV text into row objects mapped to field names. */
function tsvToRows(tsv: string, fields: string[]): Record<string, unknown>[] {
  const lines = tsv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Detect if first row is a header (matches any field name)
  const firstCells = lines[0].split('\t');
  const isHeader = firstCells.some(c => fields.includes(c.trim()));
  const dataLines = isHeader ? lines.slice(1) : lines;

  // If header present, use header order; otherwise use column order
  const colOrder = isHeader
    ? firstCells.map(c => c.trim())
    : fields.slice(0, firstCells.length);

  return dataLines.map(line => {
    const cells = line.split('\t');
    const row: Record<string, unknown> = {};
    colOrder.forEach((f, i) => {
      if (f && fields.includes(f)) {
        row[f] = cells[i] ?? '';
      }
    });
    return row;
  });
}

interface UseGridClipboardOptions {
  api: GridApi | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  columns: (ColDef | ColGroupDef)[];
  onDataChanged: () => void;
}

export function useGridClipboard({ api, containerRef, columns, onDataChanged }: UseGridClipboardOptions) {
  const fields = getFields(columns);

  const handleCopy = useCallback(async (cut: boolean) => {
    if (!api) return;
    const selected = api.getSelectedRows();
    if (selected.length === 0) return;
    const tsv = rowsToTsv(selected, fields);
    try { await navigator.clipboard.writeText(tsv); } catch { /* fallback: ignore */ }
    if (cut) {
      // Clear the cells of selected rows (keep rows, blank out values)
      selected.forEach(row => { fields.forEach(f => { row[f] = ''; }); });
      api.applyTransaction({ update: selected });
      onDataChanged();
    }
  }, [api, fields, onDataChanged]);

  const handlePaste = useCallback(async () => {
    if (!api) return;
    let tsv: string;
    try { tsv = await navigator.clipboard.readText(); } catch { return; }
    if (!tsv.trim()) return;

    const newRows = tsvToRows(tsv, fields);
    if (newRows.length === 0) return;

    // Strategy: if rows are selected, replace them with pasted data.
    // Otherwise append pasted rows at the end.
    const selected = api.getSelectedRows();
    if (selected.length > 0) {
      // Overwrite existing rows starting from first selected
      const allRows: Record<string, unknown>[] = [];
      api.forEachNode(n => { if (n.data) allRows.push(n.data); });
      const startIdx = allRows.indexOf(selected[0]);

      const toUpdate: Record<string, unknown>[] = [];
      const toAdd: Record<string, unknown>[] = [];

      newRows.forEach((nr, i) => {
        const targetIdx = startIdx + i;
        if (targetIdx < allRows.length) {
          // Merge pasted data into existing row
          const existing = allRows[targetIdx];
          Object.entries(nr).forEach(([k, v]) => { existing[k] = v; });
          toUpdate.push(existing);
        } else {
          toAdd.push(nr);
        }
      });

      api.applyTransaction({ update: toUpdate, add: toAdd });
    } else {
      // Append as new rows
      api.applyTransaction({ add: newRows });
    }
    onDataChanged();
  }, [api, fields, onDataChanged]);

  const handleDelete = useCallback(() => {
    if (!api) return;
    const selected = api.getSelectedRows();
    if (selected.length === 0) return;
    // Clear cell values (not delete rows — more predictable for architects)
    selected.forEach(row => { fields.forEach(f => { row[f] = ''; }); });
    api.applyTransaction({ update: selected });
    onDataChanged();
  }, [api, fields, onDataChanged]);

  const handleSelectAll = useCallback(() => {
    if (!api) return;
    api.selectAll();
  }, [api]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when editing a cell
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'c') {
        e.preventDefault();
        void handleCopy(false);
      } else if (ctrl && e.key === 'x') {
        e.preventDefault();
        void handleCopy(true);
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        void handlePaste();
      } else if (ctrl && e.key === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not in an editor
        if (!active?.closest('.ag-cell-edit-wrapper')) {
          e.preventDefault();
          handleDelete();
        }
      }
    };

    el.addEventListener('keydown', onKeyDown);
    return () => el.removeEventListener('keydown', onKeyDown);
  }, [containerRef, handleCopy, handlePaste, handleDelete, handleSelectAll]);
}
