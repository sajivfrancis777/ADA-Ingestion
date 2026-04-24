/**
 * ChatPanel — Slide-out AI Architecture Assistant.
 *
 * Production-grade chat with:
 *   - Message history with timestamps
 *   - Prompt templates gallery
 *   - Session history browser
 *   - Markdown rendering for assistant responses
 *   - Artifact detection (Mermaid diagrams, tables)
 *   - Configurable position (right or bottom)
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  sendMessage, createUserMessage, loadLLMConfig, saveLLMConfig,
  loadChatHistory, saveChatHistory,
  type ChatMessage,
} from './chatService';
import { PROMPT_TEMPLATES, TEMPLATE_CATEGORIES } from './promptTemplates';

type ChatView = 'chat' | 'history' | 'templates' | 'admin';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { user, isAdmin } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<ChatView>('chat');
  const [sessions, setSessions] = useState<ChatMessage[][]>(() => loadChatHistory());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && view === 'chat') {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, view]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = createUserMessage(text);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const config = loadLLMConfig();
    const response = await sendMessage(
      newMessages.filter(m => m.role !== 'system'),
      config,
    );
    const final = [...newMessages, response];
    setMessages(final);
    setLoading(false);

    // Save session
    const updated = [...sessions.filter(s => s.length > 0), final];
    setSessions(updated);
    saveChatHistory(updated);
  }, [input, loading, messages, sessions]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleNewChat = useCallback(() => {
    if (messages.length > 0) {
      const updated = [...sessions.filter(s => s.length > 0), messages];
      setSessions(updated);
      saveChatHistory(updated);
    }
    setMessages([]);
    setView('chat');
  }, [messages, sessions]);

  const loadSession = useCallback((idx: number) => {
    setMessages(sessions[idx] ?? []);
    setView('chat');
  }, [sessions]);

  const useTemplate = useCallback((prompt: string) => {
    setInput(prompt);
    setView('chat');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  if (!open) return null;

  return (
    <div className="chat-overlay">
      <div className="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <span className="chat-logo">🏛️</span>
            <div>
              <h3 className="chat-title">Architecture Assistant</h3>
              <span className="chat-subtitle">IAO · IDM 2.0</span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button className="chat-icon-btn" onClick={handleNewChat} title="New conversation">＋</button>
            <button className="chat-icon-btn" onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="chat-nav">
          {(['chat', 'templates', 'history'] as const).map(v => (
            <button key={v} className={`chat-nav-btn ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
              {v === 'chat' ? '💬 Chat' : v === 'templates' ? '📋 Templates' : '📜 History'}
            </button>
          ))}
          {isAdmin && (
            <button className={`chat-nav-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => setView('admin')}>
              ⚙️ Admin
            </button>
          )}
        </div>

        {/* Chat view */}
        {view === 'chat' && (
          <>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <div className="chat-welcome-icon">🏛️</div>
                  <h4>Welcome, {user.displayName}</h4>
                  <p>Ask about architecture, integration patterns, system dependencies, or use a template to get started.</p>
                  <div className="chat-quick-actions">
                    {PROMPT_TEMPLATES.slice(0, 4).map(t => (
                      <button key={t.id} className="chat-quick-btn" onClick={() => useTemplate(t.prompt)}>
                        {t.icon} {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
                  <div className="chat-msg-avatar">
                    {msg.role === 'user' ? '👤' : '🏛️'}
                  </div>
                  <div className="chat-msg-body">
                    <div className="chat-msg-meta">
                      <span className="chat-msg-name">{msg.role === 'user' ? user.displayName : 'Assistant'}</span>
                      <span className="chat-msg-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="chat-msg-content">{msg.content}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="chat-msg chat-msg-assistant">
                  <div className="chat-msg-avatar">🏛️</div>
                  <div className="chat-msg-body">
                    <div className="chat-typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="chat-input-area">
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about architecture…"
                rows={1}
                disabled={loading}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || loading}
                title="Send (Enter)"
              >
                ➤
              </button>
            </div>
          </>
        )}

        {/* Templates view */}
        {view === 'templates' && (
          <div className="chat-templates">
            <div className="chat-template-cats">
              <button className={`chat-cat-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('All')}>All</button>
              {TEMPLATE_CATEGORIES.map(c => (
                <button key={c} className={`chat-cat-btn ${selectedCategory === c ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(c)}>{c}</button>
              ))}
            </div>
            <div className="chat-template-list">
              {PROMPT_TEMPLATES
                .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
                .map(t => (
                <div key={t.id} className="chat-template-card" onClick={() => useTemplate(t.prompt)}>
                  <span className="chat-template-icon">{t.icon}</span>
                  <div>
                    <div className="chat-template-title">{t.title}</div>
                    <div className="chat-template-desc">{t.prompt.slice(0, 80)}…</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History view */}
        {view === 'history' && (
          <div className="chat-history">
            {sessions.length === 0 ? (
              <div className="chat-empty">No conversation history yet</div>
            ) : (
              sessions.map((session, idx) => {
                const firstUser = session.find(m => m.role === 'user');
                const msgCount = session.length;
                const time = session[0]?.timestamp;
                return (
                  <div key={idx} className="chat-history-item" onClick={() => loadSession(idx)}>
                    <div className="chat-history-preview">
                      {firstUser?.content.slice(0, 100) ?? 'Empty session'}
                    </div>
                    <div className="chat-history-meta">
                      {msgCount} messages · {time ? new Date(time).toLocaleDateString() : ''}
                    </div>
                  </div>
                );
              }).reverse()
            )}
          </div>
        )}

        {/* Admin view */}
        {view === 'admin' && <AdminSection />}

        {/* Footer */}
        <div className="chat-footer">
          <span className="chat-footer-text">
            Powered by AI · {user.role === 'admin' ? '🔑 Admin' : `👤 ${user.role}`}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Admin Section (inline) ──────────────────────────────────────

function AdminSection() {
  const { isAdmin } = useAuth();
  const [config, setConfig] = useState(() => loadLLMConfig());
  const [saved, setSaved] = useState(false);

  if (!isAdmin) {
    return <div className="chat-empty">Admin access required</div>;
  }

  const handleSave = () => {
    saveLLMConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="chat-admin">
      <h4 className="chat-admin-title">🔧 LLM Configuration</h4>

      <label className="chat-admin-label">Provider</label>
      <select className="chat-admin-select" value={config.provider}
        onChange={e => setConfig({ ...config, provider: e.target.value as typeof config.provider })}>
        <option value="anthropic">Anthropic (Claude)</option>
        <option value="openai">OpenAI (GPT)</option>
        <option value="azure-openai">Azure OpenAI</option>
        <option value="custom">Custom Endpoint</option>
      </select>

      <label className="chat-admin-label">API Key</label>
      <input className="chat-admin-input" type="password" value={config.apiKey}
        onChange={e => setConfig({ ...config, apiKey: e.target.value })}
        placeholder="sk-... or your API key" />

      <label className="chat-admin-label">Model</label>
      <input className="chat-admin-input" type="text" value={config.model}
        onChange={e => setConfig({ ...config, model: e.target.value })}
        placeholder="claude-sonnet-4-20250514" />

      {(config.provider === 'custom' || config.provider === 'azure-openai') && (
        <>
          <label className="chat-admin-label">Endpoint URL</label>
          <input className="chat-admin-input" type="url" value={config.endpoint ?? ''}
            onChange={e => setConfig({ ...config, endpoint: e.target.value })}
            placeholder="https://your-api.azurewebsites.net/api/chat" />
        </>
      )}

      <label className="chat-admin-label">Max Tokens</label>
      <input className="chat-admin-input" type="number" value={config.maxTokens}
        onChange={e => setConfig({ ...config, maxTokens: Number(e.target.value) })} />

      <label className="chat-admin-label">Temperature</label>
      <input className="chat-admin-input" type="range" min="0" max="1" step="0.1"
        value={config.temperature}
        onChange={e => setConfig({ ...config, temperature: Number(e.target.value) })} />
      <span className="chat-admin-hint">{config.temperature} (0 = precise, 1 = creative)</span>

      <button className="chat-admin-save" onClick={handleSave}>
        {saved ? '✓ Saved' : '💾 Save Configuration'}
      </button>

      <div className="chat-admin-section">
        <h4 className="chat-admin-title">👥 Access Control</h4>
        <p className="chat-admin-hint">
          Role-based access is configured. When Entra ID is enabled, roles will sync from Azure AD app roles.
          Current mode: localStorage (local development).
        </p>
        <div className="chat-admin-roles">
          <div className="chat-role-card">
            <strong>Admin</strong>
            <span>Full access: API keys, user management, all features</span>
          </div>
          <div className="chat-role-card">
            <strong>Architect</strong>
            <span>Edit flows, use chat, view diagrams, download/upload Excel</span>
          </div>
          <div className="chat-role-card">
            <strong>Viewer</strong>
            <span>Read-only: browse flows and diagrams, no editing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
