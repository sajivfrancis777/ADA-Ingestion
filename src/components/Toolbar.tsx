/**
 * Toolbar — Load XLSX, Download XLSX, and file info display.
 */
import { useRef } from 'react';

interface ToolbarProps {
  tower: string;
  cap: string;
  hasData: boolean;
  onLoadFile: (data: ArrayBuffer) => void;
  onDownload: () => void;
}

export default function Toolbar({ tower, cap, hasData, onLoadFile, onDownload }: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        onLoadFile(reader.result);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset so the same file can be re-loaded
    e.target.value = '';
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
          Load XLSX
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          className="btn btn-success"
          onClick={onDownload}
          disabled={!hasData}
        >
          Download XLSX
        </button>
      </div>
      <div className="toolbar-right">
        <span className="file-info">{tower} / {cap}</span>
      </div>
    </div>
  );
}
