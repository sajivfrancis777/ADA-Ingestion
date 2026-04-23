/**
 * DiagramPreview — Live Mermaid diagram rendered from Flows tab data.
 *
 * Debounces re-renders (500ms after last change) so typing in the grid
 * doesn't cause constant SVG redraws. Pan and zoom via mouse wheel.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { flowsToMermaid, type FlowRow } from '../utils/flowsToMermaid';

// Initialize mermaid once
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  fontFamily: 'Segoe UI, Arial, sans-serif',
});

interface DiagramPreviewProps {
  /** Current Flows tab rows from the grid */
  rows: FlowRow[];
  /** Whether the preview panel is visible */
  visible: boolean;
}

let renderCount = 0;

export default function DiagramPreview({ rows, visible }: DiagramPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced render
  useEffect(() => {
    if (!visible) return;

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const mermaidSyntax = flowsToMermaid(rows);
        if (!mermaidSyntax) {
          setSvgHtml('');
          setError(null);
          return;
        }

        const id = `diagram-${++renderCount}`;
        const { svg } = await mermaid.render(id, mermaidSyntax);
        setSvgHtml(svg);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Diagram render failed');
        setSvgHtml('');
      }
    }, 500);

    return () => clearTimeout(debounceRef.current);
  }, [rows, visible]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.2), 3));
  }, []);

  // Pan via drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startTx: translate.x, startTy: translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTranslate({ x: dragRef.current.startTx + dx, y: dragRef.current.startTy + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current.dragging = false;
  }, []);

  // Reset zoom/pan
  const handleReset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  if (!visible) return null;

  const validRows = rows.filter(r => r['Source System'] && r['Target System']);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      border: '1px solid #ddd',
      borderRadius: 4,
      background: '#fafbfc',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderBottom: '1px solid #ddd',
        background: '#f0f4f8',
        fontSize: 12,
      }}>
        <strong style={{ color: '#0071C5' }}>Diagram Preview</strong>
        <span style={{ color: '#666' }}>
          {validRows.length} flow{validRows.length !== 1 ? 's' : ''} · {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.min(s * 1.2, 3))}
          style={btnStyle}
          title="Zoom in"
        >+</button>
        <button
          onClick={() => setScale(s => Math.max(s * 0.8, 0.2))}
          style={btnStyle}
          title="Zoom out"
        >−</button>
        <button onClick={handleReset} style={btnStyle} title="Reset zoom">⟳</button>
        <span style={{ marginLeft: 'auto', color: '#999', fontSize: 11 }}>
          Scroll to zoom · Drag to pan
        </span>
      </div>

      {/* Diagram area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          flex: 1,
          overflow: 'hidden',
          cursor: dragRef.current.dragging ? 'grabbing' : 'grab',
          position: 'relative',
        }}
      >
        {error && (
          <div style={{ padding: 16, color: '#c62828', fontSize: 13 }}>
            ⚠ Diagram error: {error}
          </div>
        )}

        {!error && !svgHtml && validRows.length === 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#999',
            fontSize: 14,
          }}>
            Enter Source System → Target System flows to see the diagram
          </div>
        )}

        {svgHtml && (
          <div
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              padding: 20,
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '2px 8px',
  border: '1px solid #ccc',
  borderRadius: 3,
  background: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  lineHeight: '20px',
};
