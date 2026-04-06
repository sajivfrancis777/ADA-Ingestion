/**
 * GitHubTokenModal — small modal for entering/validating a GitHub write PAT.
 */
import { useState } from 'react';
import { getWriteToken, setWriteToken, clearWriteToken, validateToken } from '../utils/githubSave';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function GitHubTokenModal({ open, onClose }: Props) {
  const [token, setToken] = useState(() => getWriteToken() ?? '');
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      clearWriteToken();
      setStatus('idle');
      setMessage('Token cleared.');
      return;
    }
    setStatus('checking');
    setMessage('Validating…');
    const result = await validateToken(trimmed);
    if (result.valid) {
      setWriteToken(trimmed);
      setStatus('valid');
      setMessage(result.message);
    } else {
      setStatus('invalid');
      setMessage(result.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>GitHub Write Token</h3>
        <p className="modal-desc">
          Enter a <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer">
          fine-grained PAT</a> with <strong>Contents: Read and write</strong> access
          to <code>sajivfrancis777/IAO-Architecture</code>.
        </p>
        <input
          type="password"
          className="modal-input"
          value={token}
          onChange={e => { setToken(e.target.value); setStatus('idle'); }}
          placeholder="github_pat_..."
          spellCheck={false}
        />
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={status === 'checking'}>
            {status === 'checking' ? 'Checking…' : 'Save & Validate'}
          </button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        {message && (
          <div className={`modal-status ${status === 'valid' ? 'status-ok' : status === 'invalid' ? 'status-err' : ''}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
