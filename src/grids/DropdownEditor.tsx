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

  useImperativeHandle(ref, () => ({
    getValue() {
      return selectedValue;
    },
    isPopup() {
      return true;
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
      autoFocus
      onMouseDown={e => e.stopPropagation()}
      style={{
        width: '100%',
        minWidth: 180,
        height: 32,
        fontSize: 13,
        fontFamily: 'inherit',
        border: '2px solid #0071C5',
        borderRadius: 3,
        padding: '2px 6px',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      <option value="">— select —</option>
      {props.values.map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );
});

DropdownEditor.displayName = 'DropdownEditor';
export default DropdownEditor;
