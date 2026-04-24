/**
 * InlineSelectRenderer — Renders a <select> directly in the cell.
 *
 * BYPASSES AG Grid's entire editor lifecycle. No cellEditor, no isPopup,
 * no stopEditing, no focus tracking, no getValue(). The HTML <select>
 * lives in the cell renderer and writes directly to node.data on change.
 *
 * This is the nuclear option after 8+ failed attempts to make AG Grid's
 * editor system work with dropdown selection persistence.
 */
import type { ICellRendererParams } from 'ag-grid-community';

interface InlineSelectProps extends ICellRendererParams {
  values: string[];
}

export default function InlineSelectRenderer(props: InlineSelectProps) {
  const { values = [], value, node, colDef, api } = props;
  const field = colDef?.field;
  if (!field) return <span>{value}</span>;

  return (
    <select
      value={value ?? ''}
      onChange={e => {
        const newVal = e.target.value;
        node.data[field] = newVal;
        // Notify AG Grid of the change so onCellValueChanged fires
        api.applyTransaction({ update: [node.data] });
      }}
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'transparent',
        fontSize: 13,
        fontFamily: 'inherit',
        cursor: 'pointer',
        outline: 'none',
        padding: '0 4px',
      }}
    >
      <option value="">— select —</option>
      {values.map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );
}
