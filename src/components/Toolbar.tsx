/**
 * Toolbar — Load XLSX, Save, Push to GitHub, Download XLSX, and file context display.
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
  githubStatus: 'idle' | 'pushing' | 'pushed' | 'error';
  githubMessage?: string;
  hasGitHubToken: boolean;
  lastSaved?: string | null;
  onLoadFile: (data: ArrayBuffer) => void;
  onSave: () => void;
  onPushToGitHub: () => void;
  onDownload: () => void;
  onOpenTokenSettings: () => void;
}

export default function Toolbar({
  tower, cap, release, state, hasData, dirty,
  saveStatus, githubStatus, githubMessage, hasGitHubToken,
  lastSaved, onLoadFile, onSave, onPushToGitHub, onDownload, onOpenTokenSettings,
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

  const ghLabel = githubStatus === 'pushing' ? 'Pushing…'
    : githubStatus === 'pushed' ? '✓ Pushed' : 'Push to GitHub';

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
          className={`btn ${githubStatus === 'pushed' ? 'btn-save' : githubStatus === 'error' ? 'btn-error' : 'btn-github'}`}
          onClick={onPushToGitHub}
          disabled={!hasData || githubStatus === 'pushing' || !hasGitHubToken}
          title={hasGitHubToken
            ? (githubMessage || 'Commit data to the ADA-Artifacts GitHub repo')
            : 'Set up GitHub token first (click ⚙)'}
        >
          {ghLabel}
        </button>
        <button
          className="btn btn-icon"
          onClick={onOpenTokenSettings}
          title="GitHub token settings"
        >
          ⚙
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
        {githubMessage && githubStatus === 'error' && (
          <span className="github-error" title={githubMessage}>⚠ {githubMessage}</span>
        )}
        {lastSavedLabel && <span className="save-timestamp">{lastSavedLabel}</span>}
        <span className="file-info">{tower} / {cap}</span>
        <span className="file-badge">{filename}</span>
      </div>
    </div>
  );
}
