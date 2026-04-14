/**
 * AutocompleteCellEditor — AG Grid custom cell editor with search-as-you-type.
 *
 * Optimized for large lists (5K+ items):
 *   - Debounced filtering (150ms) so typing is never blocked
 *   - Virtualized dropdown: only renders visible items, not all 200
 *   - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 *
 * Usage in columnDefs:
 *   { field: 'Source System', cellEditor: AutocompleteCellEditor,
 *     cellEditorParams: { values: ALL_SYSTEMS } }
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

const MAX_VISIBLE = 12;
const ITEM_HEIGHT = 28;
const DEBOUNCE_MS = 150;

const AutocompleteCellEditor = forwardRef(
  (props: AutocompleteParams, ref) => {
    const { values = [], maxResults = 200 } = props;
    const [text, setText] = useState(String(props.value ?? ''));
    const valueRef = useRef(String(props.value ?? ''));   // sync mirror for getValue()
    const [filtered, setFiltered] = useState<string[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const [isOpen, setIsOpen] = useState(true);
    const [scrollTop, setScrollTop] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Focus input on mount
    useEffect(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, []);

    // Debounced filter: waits 150ms after last keystroke before computing
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

    // Scroll selected item into view (virtualized)
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

    // AG Grid interface — use ref so getValue() always returns the latest value
    // even if React hasn't re-rendered yet after setText()
    useImperativeHandle(ref, () => ({
      getValue: () => valueRef.current,
      isCancelBeforeStart: () => false,
      isCancelAfterEnd: () => false,
    }));

    const handleSelect = useCallback(
      (value: string) => {
        valueRef.current = value;          // sync update before stopEditing
        setText(value);
        setIsOpen(false);
        // Tell AG Grid we're done editing
        setTimeout(() => props.stopEditing(), 0);
      },
      [props]
    );

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
            handleSelect(filtered[selectedIdx]);
          } else {
            // Accept typed text as-is
            setIsOpen(false);
            setTimeout(() => props.stopEditing(), 0);
          }
        } else if (e.key === 'Escape') {
          e.stopPropagation();
          setIsOpen(false);
          props.stopEditing(true);
        } else if (e.key === 'Tab') {
          if (selectedIdx >= 0 && selectedIdx < filtered.length) {
            handleSelect(filtered[selectedIdx]);
          }
        }
      },
      [filtered, selectedIdx, handleSelect, props]
    );

    // Virtualization: compute which items are visible based on scroll position
    const totalHeight = filtered.length * ITEM_HEIGHT;
    const containerHeight = MAX_VISIBLE * ITEM_HEIGHT;
    const startIdx = Math.floor(scrollTop / ITEM_HEIGHT);
    const endIdx = Math.min(startIdx + MAX_VISIBLE + 2, filtered.length); // +2 buffer
    const offsetY = startIdx * ITEM_HEIGHT;

    const handleScroll = useCallback(() => {
      if (listRef.current) {
        setScrollTop(listRef.current.scrollTop);
      }
    }, []);

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={e => {
            valueRef.current = e.target.value;  // keep ref in sync
            setText(e.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid #0071C5',
            borderRadius: 3,
            padding: '2px 6px',
            fontSize: 13,
            boxSizing: 'border-box',
            outline: 'none',
          }}
          placeholder="Type to search systems…"
        />
        {isOpen && filtered.length > 0 && (
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: containerHeight,
              overflowY: 'auto',
              backgroundColor: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 9999,
              fontSize: 13,
            }}
          >
            {/* Virtualized inner container — only visible items rendered */}
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
                {filtered.slice(startIdx, endIdx).map((item, i) => {
                  const realIdx = startIdx + i;
                  return (
                    <div
                      key={item}
                      onMouseDown={e => e.preventDefault()}   // prevent input blur → AG Grid cancel
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIdx(realIdx)}
                      style={{
                        height: ITEM_HEIGHT,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        backgroundColor:
                          realIdx === selectedIdx ? '#0071C5' : 'transparent',
                        color: realIdx === selectedIdx ? '#fff' : '#333',
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
                  );
                })}
              </div>
            </div>
            {filtered.length >= maxResults && (
              <div
                style={{
                  padding: '4px 8px',
                  color: '#999',
                  fontStyle: 'italic',
                  fontSize: 11,
                }}
              >
                Type more to narrow results…
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

AutocompleteCellEditor.displayName = 'AutocompleteCellEditor';
export default AutocompleteCellEditor;
