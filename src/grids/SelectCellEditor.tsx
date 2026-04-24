/**
 * SelectCellEditor — Custom AG Grid select editor that WORKS.
 *
 * Replaces agSelectCellEditor which has persistent focus-loss bugs in
 * AG Grid Community v32. Uses the same proven architecture as
 * AutocompleteCellEditor: isPopup=true, no portal, direct child div.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

interface SelectParams extends ICellEditorParams {
  values: string[];
}

const ITEM_HEIGHT = 32;
const MAX_VISIBLE = 10;

const SelectCellEditor = forwardRef(
  (props: SelectParams, ref) => {
    const { values = [] } = props;
    const currentValue = String(props.value ?? '');
    const [selectedIdx, setSelectedIdx] = useState(() =>
      Math.max(values.indexOf(currentValue), 0)
    );
    const valueRef = useRef(currentValue);
    const stoppedRef = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // AG Grid editor interface
    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      isPopup: () => true,
      getPopupPosition: () => 'under' as const,
      isCancelBeforeStart: () => false,
      isCancelAfterEnd: () => false,
    }));

    // Scroll current value into view on mount
    useEffect(() => {
      if (listRef.current && selectedIdx > 0) {
        const itemTop = selectedIdx * ITEM_HEIGHT;
        const containerH = MAX_VISIBLE * ITEM_HEIGHT;
        if (itemTop > containerH - ITEM_HEIGHT) {
          listRef.current.scrollTop = itemTop - containerH / 2;
        }
      }
    }, [selectedIdx]);

    // Keyboard on the list container
    useEffect(() => {
      rootRef.current?.focus();
    }, []);

    const commitAndClose = useCallback(
      (value: string) => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;
        valueRef.current = value;
        props.stopEditing(false);
      },
      [props],
    );

    const cancelAndClose = useCallback(() => {
      if (stoppedRef.current) return;
      stoppedRef.current = true;
      props.stopEditing(true);
    }, [props]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIdx(prev => Math.min(prev + 1, values.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          commitAndClose(values[selectedIdx] ?? currentValue);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelAndClose();
        }
      },
      [values, selectedIdx, commitAndClose, cancelAndClose, currentValue],
    );

    // Click outside → commit
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (stoppedRef.current) return;
        if (rootRef.current?.contains(e.target as Node)) return;
        commitAndClose(values[selectedIdx] ?? currentValue);
      };
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handler, true);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handler, true);
      };
    }, [commitAndClose, values, selectedIdx, currentValue]);

    const containerHeight = Math.min(values.length, MAX_VISIBLE) * ITEM_HEIGHT;

    return (
      <div
        ref={rootRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
        style={{
          width: 220,
          outline: 'none',
          background: '#fff',
          border: '1px solid #ccc',
          borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div
          ref={listRef}
          style={{
            maxHeight: containerHeight,
            overflowY: 'auto',
            fontSize: 13,
          }}
        >
          {values.map((item, i) => (
            <div
              key={item}
              onMouseDown={e => {
                e.preventDefault();
                e.stopPropagation();
                commitAndClose(item);
              }}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                height: ITEM_HEIGHT,
                padding: '4px 10px',
                cursor: 'pointer',
                backgroundColor: i === selectedIdx ? '#0071C5' : 'transparent',
                color: i === selectedIdx ? '#fff' : '#333',
                borderBottom: '1px solid #f0f0f0',
                lineHeight: `${ITEM_HEIGHT - 8}px`,
                boxSizing: 'border-box',
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  },
);

SelectCellEditor.displayName = 'SelectCellEditor';
export default SelectCellEditor;
