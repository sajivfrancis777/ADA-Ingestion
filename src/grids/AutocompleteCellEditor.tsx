/**
 * AutocompleteCellEditor — AG Grid custom cell editor with search-as-you-type.
 *
 * KEY DESIGN: No React portal. The dropdown is a direct child of the editor
 * div. AG Grid renders popup editors (isPopup=true) in its own absolutely-
 * positioned wrapper, so the dropdown is already outside the cell's
 * overflow:hidden — no portal needed.
 *
 * This eliminates ALL portal-related bugs:
 *   - No focus race with stopEditingWhenCellsLoseFocus
 *   - No event propagation conflicts with AG Grid's document listeners
 *   - No popup service click-outside false positives
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

interface AutocompleteParams extends ICellEditorParams {
  values: string[];
  maxResults?: number;
}

const MAX_VISIBLE = 10;
const ITEM_HEIGHT = 30;
const DEBOUNCE_MS = 150;
const DROPDOWN_WIDTH = 320;

const AutocompleteCellEditor = forwardRef(
  (props: AutocompleteParams, ref) => {
    const { values = [], maxResults = 200 } = props;
    const [text, setText] = useState(String(props.value ?? ''));
    const valueRef = useRef(String(props.value ?? ''));
    const [filtered, setFiltered] = useState<string[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const [isOpen, setIsOpen] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();
    const stoppedRef = useRef(false);

    // Focus input on mount
    useEffect(() => {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }, []);

    // Debounced filter
    useEffect(() => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (!text.trim()) {
          setFiltered(values.slice(0, maxResults));
        } else {
          const lower = text.toLowerCase();
          const matches = values.filter(v => v.toLowerCase().includes(lower));
          setFiltered(matches.slice(0, maxResults));
        }
        setSelectedIdx(-1);
      }, DEBOUNCE_MS);
      return () => clearTimeout(debounceRef.current);
    }, [text, values, maxResults]);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIdx >= 0 && listRef.current) {
        const containerH = MAX_VISIBLE * ITEM_HEIGHT;
        const itemTop = selectedIdx * ITEM_HEIGHT;
        const itemBot = itemTop + ITEM_HEIGHT;
        const st = listRef.current.scrollTop;
        if (itemBot > st + containerH) {
          listRef.current.scrollTop = itemBot - containerH;
        } else if (itemTop < st) {
          listRef.current.scrollTop = itemTop;
        }
      }
    }, [selectedIdx]);

    // AG Grid editor interface
    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      isPopup: () => true,
      getPopupPosition: () => 'under' as const,
      isCancelBeforeStart: () => false,
      isCancelAfterEnd: () => false,
    }));

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
          setSelectedIdx(prev => Math.min(prev + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedIdx(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (selectedIdx >= 0 && selectedIdx < filtered.length) {
            commitAndClose(filtered[selectedIdx]);
          } else {
            commitAndClose(text);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelAndClose();
        } else if (e.key === 'Tab') {
          if (selectedIdx >= 0 && selectedIdx < filtered.length) {
            commitAndClose(filtered[selectedIdx]);
          } else {
            commitAndClose(text);
          }
        }
      },
      [filtered, selectedIdx, commitAndClose, cancelAndClose, text],
    );

    // Click outside detection — commit typed value
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        if (stoppedRef.current) return;
        if (rootRef.current?.contains(e.target as Node)) return;
        commitAndClose(valueRef.current);
      };
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handler, true);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handler, true);
      };
    }, [commitAndClose]);

    const containerHeight = Math.min(filtered.length, MAX_VISIBLE) * ITEM_HEIGHT;

    return (
      <div
        ref={rootRef}
        style={{ width: DROPDOWN_WIDTH, background: '#fff' }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => {
            valueRef.current = e.target.value;
            setText(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: 32,
            border: '2px solid #0071C5',
            borderRadius: isOpen && filtered.length > 0 ? '3px 3px 0 0' : 3,
            padding: '2px 8px',
            fontSize: 13,
            boxSizing: 'border-box',
            outline: 'none',
          }}
          placeholder="Type to search systems…"
        />

        {isOpen && filtered.length > 0 && (
          <div
            ref={listRef}
            style={{
              maxHeight: containerHeight,
              overflowY: 'auto',
              border: '1px solid #ccc',
              borderTop: 'none',
              borderRadius: '0 0 4px 4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              background: '#fff',
              fontSize: 13,
            }}
          >
            {filtered.map((item, i) => (
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
                  padding: '4px 8px',
                  cursor: 'pointer',
                  backgroundColor: i === selectedIdx ? '#0071C5' : 'transparent',
                  color: i === selectedIdx ? '#fff' : '#333',
                  borderBottom: '1px solid #f0f0f0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: `${ITEM_HEIGHT - 8}px`,
                  boxSizing: 'border-box',
                }}
              >
                {item}
              </div>
            ))}
            {filtered.length >= maxResults && (
              <div style={{ padding: '4px 8px', color: '#999', fontStyle: 'italic', fontSize: 11 }}>
                Type more to narrow results…
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

AutocompleteCellEditor.displayName = 'AutocompleteCellEditor';
export default AutocompleteCellEditor;
