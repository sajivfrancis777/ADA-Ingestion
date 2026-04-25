/**
 * UserProfilePanel — User profile, preferences, and personal API key.
 */
import { useState } from 'react';
import { useAuth, type UserRole } from '../auth/AuthContext';
import { loadLLMConfig, saveLLMConfig, clearChatHistory, clearLLMApiKey, exportChatHistory, resetAllSettings } from '../chat/chatService';

interface UserProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function UserProfilePanel({ open, onClose }: UserProfilePanelProps) {
  const { user, isAdmin, updateProfile, updatePreferences, setRole } = useAuth();
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);
  const [llmConfig, setLlmConfig] = useState(() => loadLLMConfig());
  const [keySaved, setKeySaved] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  if (!open) return null;

  const handleSave = () => {
    updateProfile({ displayName: name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleKeySave = () => {
    saveLLMConfig(llmConfig);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  return (
    <div className="chat-overlay" onClick={onClose}>
      <div className="profile-panel" onClick={e => e.stopPropagation()}>
        <div className="profile-header">
          <div className="profile-avatar">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="profile-name">{user.displayName}</h3>
            <span className="profile-role-badge">{user.role}</span>
          </div>
          <button className="profile-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="profile-section">
          <h4>Profile</h4>
          <label className="chat-admin-label">Display Name</label>
          <input className="chat-admin-input" value={name} onChange={e => setName(e.target.value)} />
          <label className="chat-admin-label">Email</label>
          <input className="chat-admin-input" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@intel.com" />
          <button className="chat-admin-save" onClick={handleSave} style={{ marginTop: 12 }}>
            {saved ? '✓ Saved' : '💾 Save Profile'}
          </button>
        </div>

        {/* API Key — accessible to ALL users for testing */}
        <div className="profile-section">
          <h4>🔑 AI Assistant — API Key</h4>
          <p className="chat-admin-hint" style={{ marginBottom: 8 }}>
            Enter your own API key to enable the chat assistant. Each user manages their own key locally.
          </p>
          <label className="chat-admin-label">Provider</label>
          <select className="chat-admin-select" value={llmConfig.provider}
            onChange={e => setLlmConfig(c => ({ ...c, provider: e.target.value as typeof c.provider }))}>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="azure-openai">Azure OpenAI</option>
            <option value="custom">Custom Endpoint</option>
          </select>
          <label className="chat-admin-label">API Key</label>
          <input className="chat-admin-input" type="password" value={llmConfig.apiKey}
            onChange={e => setLlmConfig(c => ({ ...c, apiKey: e.target.value }))}
            placeholder="sk-ant-... or sk-..." />
          <label className="chat-admin-label">Model</label>
          <input className="chat-admin-input" value={llmConfig.model}
            onChange={e => setLlmConfig(c => ({ ...c, model: e.target.value }))}
            placeholder="claude-sonnet-4-20250514" />
          {(llmConfig.provider === 'custom' || llmConfig.provider === 'azure-openai') && (
            <>
              <label className="chat-admin-label">Endpoint URL</label>
              <input className="chat-admin-input" type="url" value={llmConfig.endpoint ?? ''}
                onChange={e => setLlmConfig(c => ({ ...c, endpoint: e.target.value }))}
                placeholder="https://your-api.azurewebsites.net/api/chat" />
            </>
          )}
          <button className="chat-admin-save" onClick={handleKeySave} style={{ marginTop: 12 }}>
            {keySaved ? '✓ Key Saved' : '🔑 Save API Key'}
          </button>
        </div>

        <div className="profile-section">
          <h4>Preferences</h4>
          <label className="chat-admin-label">Theme</label>
          <select className="chat-admin-select" value={user.preferences.theme}
            onChange={e => updatePreferences({ theme: e.target.value as 'light' | 'dark' | 'system' })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>

          <label className="chat-admin-label">Font Size</label>
          <select className="chat-admin-select" value={user.preferences.fontSize}
            onChange={e => updatePreferences({ fontSize: e.target.value as 'small' | 'medium' | 'large' })}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>

          <label className="chat-admin-label">Chat Position</label>
          <select className="chat-admin-select" value={user.preferences.chatPosition}
            onChange={e => updatePreferences({ chatPosition: e.target.value as 'right' | 'bottom' })}>
            <option value="right">Right Panel</option>
            <option value="bottom">Bottom Panel</option>
          </select>

          <label className="chat-admin-label">Max Response Tokens</label>
          <select className="chat-admin-select" value={String(llmConfig.maxTokens)}
            onChange={e => {
              const updated = { ...llmConfig, maxTokens: Number(e.target.value) };
              setLlmConfig(updated);
              saveLLMConfig(updated);
            }}>
            <option value="1024">Short (1024)</option>
            <option value="2048">Medium (2048)</option>
            <option value="4096">Long (4096)</option>
          </select>
        </div>

        <div className="profile-section">
          <h4>🗄️ Data Management</h4>
          {actionMsg && <p className="chat-admin-hint" style={{ color: '#16a34a', fontWeight: 600 }}>{actionMsg}</p>}
          <div className="dm-actions">
            <button className="dm-btn" onClick={() => {
              const blob = new Blob([exportChatHistory()], { type: 'application/json' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
              a.download = `iao-chat-history-${new Date().toISOString().slice(0, 10)}.json`;
              a.click(); URL.revokeObjectURL(a.href);
              setActionMsg('✓ Exported!'); setTimeout(() => setActionMsg(''), 2000);
            }}>📥 Export Chat History</button>
            <button className="dm-btn dm-danger" onClick={() => {
              if (!confirm('Delete ALL chat history? This cannot be undone.')) return;
              clearChatHistory();
              setActionMsg('✓ History cleared!'); setTimeout(() => setActionMsg(''), 2000);
            }}>🗑 Clear Chat History</button>
            <button className="dm-btn dm-danger" onClick={() => {
              if (!confirm('Remove stored API key?')) return;
              clearLLMApiKey();
              setLlmConfig(c => ({ ...c, apiKey: '' }));
              setActionMsg('✓ API key cleared!'); setTimeout(() => setActionMsg(''), 2000);
            }}>🔑 Clear API Key</button>
            <button className="dm-btn dm-danger" onClick={() => {
              if (!confirm('Reset ALL settings, history, and profile to defaults? This cannot be undone.')) return;
              resetAllSettings();
              setLlmConfig(loadLLMConfig());
              setActionMsg('✓ Reset complete!'); setTimeout(() => setActionMsg(''), 2000);
            }}>⚠️ Reset All Settings</button>
          </div>
        </div>

        {isAdmin && (
          <div className="profile-section">
            <h4>🛠️ Developer Mode</h4>
            <label className="chat-admin-label">Simulate Role</label>
            <select className="chat-admin-select" value={user.role}
              onChange={e => setRole(e.target.value as UserRole)}>
              <option value="admin">Admin</option>
              <option value="architect">Architect</option>
              <option value="viewer">Viewer</option>
            </select>
            <p className="chat-admin-hint">Role simulation for testing. Entra ID roles override this.</p>
          </div>
        )}
      </div>
    </div>
  );
}
