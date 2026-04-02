/**
 * Toolbar — Load XLSX, Save, Download XLSX, and file context display.
 */
import { useRef } from 'react';

interface ToolbarProps {
  tower: string;
  cap: string;
  release: string;
  state: string;
  hasData: boolean;
  dirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  lastSaved?: string | null;
  onLoadFile: (data: ArrayBuffer) => void;
  onSave: () => void;
  onDownload: () => void;
}

export default function Toolbar({
  tower, cap, release, state, hasData, dirty,
  saveStatus, lastSaved, onLoadFile, onSave, onDownload,
}: ToolbarProps) {
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
    e.target.value = '';
  };

  const prefix = release === 'All' ? '' : `${release}_`;
  const filename = `${prefix}${state}Flows.xlsx`;

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? '✓ Saved' : 'Save';

  const lastSavedLabel = lastSaved
    ? `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`
    : '';

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
          className={`btn ${dirty ? 'btn-save-dirty' : 'btn-save'}`}
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          title={lastSavedLabel || 'Save changes locally (browser storage)'}
        >
          {saveLabel}
        </button>
        <button
          className="btn btn-success"
          onClick={onDownload}
          disabled={!hasData}
        >
          Download XLSX
        </button>
      </div>
      <div className="toolbar-right">
        {lastSavedLabel && <span className="save-timestamp">{lastSavedLabel}</span>}
        <span className="file-info">{tower} / {cap}</span>
        <span className="file-badge">{filename}</span>
      </div>
    </div>
  );
}
