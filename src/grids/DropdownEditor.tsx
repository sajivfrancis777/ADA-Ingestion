/**
 * DropdownEditor — AG Grid custom cell editor for <select> dropdowns.
 *
 * The CRITICAL fix: props.onValueChange() is called on every selection.
 * Without this call, AG Grid never marks the cell dirty and silently
 * reverts the value when the editor closes.
 *
 * Reference: https://stackoverflow.com/a/79650916 (CC BY-SA 4.0)
 */
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

interface DropdownEditorParams extends ICellEditorParams {
  values: string[];
  onValueChange: (value: string) => void;
}

const DropdownEditor = forwardRef((props: DropdownEditorParams, ref) => {
  const [selectedValue, setSelectedValue] = useState(props.value ?? '');
  const optionCount = Math.min(props.values.length + 1, 10); // +1 for "— select —"

  useImperativeHandle(ref, () => ({
    getValue() {
      return selectedValue;
    },
    isPopup() {
      return true;
    },
    getPopupPosition() {
      return 'under' as const;
    },
  }));

  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const val = event.target.value;
    setSelectedValue(val);
    props.onValueChange(val);  // <-- CRITICAL: notifies AG Grid the value changed
  }, [props]);

  return (
    <select
      value={selectedValue}
      onChange={handleChange}
      size={optionCount}
      autoFocus
      onMouseDown={e => e.stopPropagation()}
      style={{
        width: '100%',
        minWidth: 220,
        fontSize: 13,
        fontFamily: 'inherit',
        border: '2px solid #0071C5',
        borderRadius: 4,
        padding: '4px 0',
        outline: 'none',
        cursor: 'pointer',
        background: '#fff',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
      }}
    >
      <option value="">— select —</option>
      {props.values.map(v => (
        <option
          key={v}
          value={v}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >{v}</option>
      ))}
    </select>
  );
});

DropdownEditor.displayName = 'DropdownEditor';
export default DropdownEditor;
