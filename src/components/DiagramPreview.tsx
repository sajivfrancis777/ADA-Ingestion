/**
 * DiagramPreview — Live Mermaid diagram with Application / Data / Technology layer toggle.
 *
 * Renders three architecture views from the same Flows tab data:
 *   Application: Source System → Target System (Interface/Technology)
 *   Data:        Source DB Platform → Target DB Platform (Data Description)
 *   Technology:  Source Tech Platform → Target Tech Platform (Integration Pattern)
 *
 * Debounced (500ms), with pan/zoom controls.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { flowsToMermaid, type FlowRow, type ArchLayer } from '../utils/flowsToMermaid';

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'base',
  fontFamily: 'Segoe UI, Arial, sans-serif',
});

interface DiagramPreviewProps {
  rows: FlowRow[];
  visible: boolean;
}

const LAYERS: { key: ArchLayer; label: string; icon: string; color: string }[] = [
  { key: 'application', label: 'Application', icon: '◈', color: '#0071C5' },
  { key: 'data',        label: 'Data',        icon: '◆', color: '#1565C0' },
  { key: 'technology',  label: 'Technology',   icon: '◉', color: '#2E7D32' },
];

let renderCount = 0;

export default function DiagramPreview({ rows, visible }: DiagramPreviewProps) {
  const [layer, setLayer] = useState<ArchLayer>('application');
  const [error, setError] = useState<string | null>(null);
  const [svgHtml, setSvgHtml] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced render — re-triggers on row data change OR layer switch
  useEffect(() => {
    if (!visible) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const syntax = flowsToMermaid(rows, layer);
        if (!syntax) {
          setSvgHtml('');
          setError(null);
          return;
        }
        const id = `diagram-${++renderCount}`;
        const { svg } = await mermaid.render(id, syntax);
        setSvgHtml(svg);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Diagram render failed');
        setSvgHtml('');
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [rows, visible, layer]);

  // Reset zoom/pan when switching layers
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [layer]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale(prev => Math.min(Math.max(prev * (e.deltaY > 0 ? 0.9 : 1.1), 0.2), 3));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, startTx: translate.x, startTy: translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current.dragging) return;
    setTranslate({ x: dragRef.current.startTx + (e.clientX - dragRef.current.startX), y: dragRef.current.startTy + (e.clientY - dragRef.current.startY) });
  }, []);

  const handleMouseUp = useCallback(() => { dragRef.current.dragging = false; }, []);

  if (!visible) return null;

  const validRows = rows.filter(r => r['Source System'] && r['Target System']);
  const activeLayer = LAYERS.find(l => l.key === layer)!;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #ddd', borderRadius: 4, background: '#fafbfc' }}>
      {/* Layer tabs + zoom controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderBottom: '1px solid #ddd', background: '#f0f4f8', fontSize: 12, flexWrap: 'wrap' }}>
        {LAYERS.map(l => (
          <button
            key={l.key}
            onClick={() => setLayer(l.key)}
            style={{
              padding: '3px 10px',
              border: layer === l.key ? `2px solid ${l.color}` : '1px solid #ccc',
              borderRadius: 3,
              background: layer === l.key ? l.color : '#fff',
              color: layer === l.key ? '#fff' : '#333',
              fontWeight: layer === l.key ? 600 : 400,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {l.icon} {l.label}
          </button>
        ))}
        <span style={{ color: '#666', marginLeft: 4 }}>
          {validRows.length} flow{validRows.length !== 1 ? 's' : ''} · {Math.round(scale * 100)}%
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={() => setScale(s => Math.min(s * 1.2, 3))} style={btnStyle} title="Zoom in">+</button>
          <button onClick={() => setScale(s => Math.max(s * 0.8, 0.2))} style={btnStyle} title="Zoom out">−</button>
          <button onClick={() => { setScale(1); setTranslate({ x: 0, y: 0 }); }} style={btnStyle} title="Reset">⟳</button>
        </div>
      </div>

      {/* Diagram area */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ flex: 1, overflow: 'hidden', cursor: dragRef.current.dragging ? 'grabbing' : 'grab', position: 'relative' }}
      >
        {error && (
          <div style={{ padding: 16, color: '#c62828', fontSize: 13 }}>
            ⚠ {activeLayer.label} diagram error: {error}
          </div>
        )}

        {!error && !svgHtml && validRows.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 14 }}>
            Enter flow data to see the {activeLayer.label.toLowerCase()} architecture diagram
          </div>
        )}

        {!error && !svgHtml && validRows.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', fontSize: 14 }}>
            No {activeLayer.label.toLowerCase()} data — fill {layer === 'data' ? 'DB Platform' : layer === 'technology' ? 'Tech Platform' : 'System'} columns
          </div>
        )}

        {svgHtml && (
          <div
            style={{ transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transformOrigin: 'top left', padding: 20 }}
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
