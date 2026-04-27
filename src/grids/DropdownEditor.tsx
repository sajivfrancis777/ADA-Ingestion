/**
 * DropdownEditor — AG Grid custom cell editor using a div-based clickable list.
 *
 * The CRITICAL fix: props.onValueChange() is called on every selection.
 * Without this call, AG Grid never marks the cell dirty and silently
 * reverts the value when the editor closes.
 *
 * Uses the same div-list pattern as AutocompleteCellEditor (which has no
 * sizing issues) instead of a native <select> (which AG Grid constrains).
 *
 * Reference: https://stackoverflow.com/a/79650916 (CC BY-SA 4.0)
 */
import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

interface DropdownEditorParams extends ICellEditorParams {
  values: string[];
  onValueChange: (value: string) => void;
}

const ITEM_HEIGHT = 32;
const MAX_VISIBLE = 10;
const MIN_DROPDOWN_WIDTH = 240;

const DropdownEditor = forwardRef((props: DropdownEditorParams, ref) => {
  const [selectedValue, setSelectedValue] = useState(props.value ?? '');
  const [highlightIdx, setHighlightIdx] = useState(() => {
    const idx = props.values.indexOf(props.value ?? '');
    return idx >= 0 ? idx + 1 : 0; // +1 for "— clear —" at index 0
  });
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // All items: clear option + values
  const allItems = ['', ...props.values];

  // Size dropdown to at least the cell width so it aligns visually
  const cellWidth = props.eGridCell?.getBoundingClientRect().width ?? 0;
  const dropdownWidth = Math.max(cellWidth, MIN_DROPDOWN_WIDTH);

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

  // Focus root div on mount and scroll selected item into view
  useEffect(() => {
    rootRef.current?.focus();
    if (listRef.current && highlightIdx > 0) {
      const itemTop = highlightIdx * ITEM_HEIGHT;
      const containerH = MAX_VISIBLE * ITEM_HEIGHT;
      if (itemTop > containerH - ITEM_HEIGHT) {
        listRef.current.scrollTop = itemTop - containerH / 2;
      }
    }
  }, []);

  const commitValue = useCallback((val: string) => {
    setSelectedValue(val);
    props.onValueChange(val);  // <-- CRITICAL: notifies AG Grid the value changed
    props.stopEditing(false);
  }, [props]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIdx(prev => Math.min(prev + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      commitValue(allItems[highlightIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      props.stopEditing(true);
    } else if (e.key === 'Tab') {
      commitValue(allItems[highlightIdx]);
    }
  }, [allItems, highlightIdx, commitValue, props]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const containerH = MAX_VISIBLE * ITEM_HEIGHT;
      const itemTop = highlightIdx * ITEM_HEIGHT;
      const itemBot = itemTop + ITEM_HEIGHT;
      const st = listRef.current.scrollTop;
      if (itemBot > st + containerH) {
        listRef.current.scrollTop = itemBot - containerH;
      } else if (itemTop < st) {
        listRef.current.scrollTop = itemTop;
      }
    }
  }, [highlightIdx]);

  const containerHeight = Math.min(allItems.length, MAX_VISIBLE) * ITEM_HEIGHT;

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      style={{ width: dropdownWidth, outline: 'none' }}
    >
      <div
        ref={listRef}
        style={{
          maxHeight: containerHeight,
          overflowY: 'auto',
          border: '2px solid #0071C5',
          borderRadius: 4,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          background: '#fff',
          fontSize: 13,
          fontFamily: 'inherit',
        }}
      >
        {allItems.map((item, idx) => {
          const isSelected = item === selectedValue;
          const isHighlighted = idx === highlightIdx;
          return (
            <div
              key={idx}
              onClick={() => commitValue(item)}
              onMouseEnter={() => setHighlightIdx(idx)}
              style={{
                height: ITEM_HEIGHT,
                lineHeight: `${ITEM_HEIGHT}px`,
                padding: '0 12px',
                cursor: 'pointer',
                background: isHighlighted ? '#0071C5' : isSelected ? '#e6f0fa' : '#fff',
                color: isHighlighted ? '#fff' : '#333',
                fontWeight: isSelected ? 600 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                borderBottom: idx < allItems.length - 1 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              {item || '— clear —'}
            </div>
          );
        })}
      </div>
      {allItems.length > MAX_VISIBLE && (
        <div style={{
          padding: '4px 12px',
          fontSize: 11,
          color: '#888',
          background: '#f8f8f8',
          borderTop: '1px solid #eee',
          borderRadius: '0 0 4px 4px',
          textAlign: 'right',
        }}>
          {allItems.length} items — ↑↓ to scroll
        </div>
      )}
    </div>
  );
});

DropdownEditor.displayName = 'DropdownEditor';
export default DropdownEditor;
