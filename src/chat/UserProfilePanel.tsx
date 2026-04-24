/**
 * UserProfilePanel — User profile and preferences editor.
 */
import { useState } from 'react';
import { useAuth, type UserRole } from '../auth/AuthContext';

interface UserProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function UserProfilePanel({ open, onClose }: UserProfilePanelProps) {
  const { user, isAdmin, updateProfile, updatePreferences, setRole } = useAuth();
  const [name, setName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    updateProfile({ displayName: name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <button className="chat-icon-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>

        <div className="profile-section">
          <h4>Profile</h4>
          <label className="chat-admin-label">Display Name</label>
          <input className="chat-admin-input" value={name} onChange={e => setName(e.target.value)} />
          <label className="chat-admin-label">Email</label>
          <input className="chat-admin-input" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@intel.com" />
          <p className="chat-admin-hint">
            When Entra ID is enabled, profile data will sync from Azure AD automatically.
          </p>
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
        </div>

        {isAdmin && (
          <div className="profile-section">
            <h4>🔑 Developer Mode</h4>
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

        <button className="chat-admin-save" onClick={handleSave}>
          {saved ? '✓ Saved' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  );
}
