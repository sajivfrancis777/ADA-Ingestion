/**
 * ChatFAB — Floating action button that opens the chat panel.
 * Distinctive Intel-branded icon with pulse animation on first visit.
 */
import { useState, useEffect } from 'react';
import ChatPanel from './ChatPanel';
import UserProfilePanel from './UserProfilePanel';
import { useAuth } from '../auth/AuthContext';

export default function ChatFAB() {
  const { user } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [firstVisit, setFirstVisit] = useState(() => !localStorage.getItem('iao_chat_visited'));

  useEffect(() => {
    if (firstVisit) {
      const timer = setTimeout(() => {
        localStorage.setItem('iao_chat_visited', '1');
        setFirstVisit(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [firstVisit]);

  return (
    <>
      {/* FAB cluster — chat + profile */}
      <div className="fab-cluster">
        {/* Profile button */}
        <button
          className="fab fab-profile"
          onClick={() => setProfileOpen(true)}
          title={`${user.displayName} · ${user.role}`}
        >
          {user.displayName.charAt(0).toUpperCase()}
        </button>

        {/* Chat button */}
        <button
          className={`fab fab-chat ${firstVisit ? 'fab-pulse' : ''} ${chatOpen ? 'fab-active' : ''}`}
          onClick={() => setChatOpen(v => !v)}
          title="Architecture Assistant"
        >
          {chatOpen ? '✕' : '🏛️'}
        </button>
      </div>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <UserProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
