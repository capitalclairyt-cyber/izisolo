'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import ConversationList from '@/components/messagerie/ConversationList';
import ChatRoom from '@/components/messagerie/ChatRoom';

export default function EspaceMessagesClient({ profile, studioSlug, client }) {
  const [selectedConvId, setSelectedConvId] = useState(null);

  return (
    <div className="esp-msg-page">
      <header className="esp-header">
        <Link href={`/p/${studioSlug}/espace`} className="esp-back" aria-label="Retour à mon espace">
          <ArrowLeft size={16} /> Mon espace
        </Link>
        <div className="esp-studio">{profile.studio_nom}</div>
      </header>

      <h1 className="esp-title">
        <MessageSquare size={20} /> Mes messages
      </h1>

      {selectedConvId ? (
        <div className="esp-chat-wrap">
          <button onClick={() => setSelectedConvId(null)} className="esp-chat-back">
            <ArrowLeft size={14} /> Retour aux messages
          </button>
          <div className="esp-chat-container">
            <ChatRoom
              conversationId={selectedConvId}
              viewerKind="eleve"
            />
          </div>
        </div>
      ) : (
        <div className="esp-list-wrap">
          <ConversationList
            onSelect={setSelectedConvId}
            selectedId={selectedConvId}
          />
        </div>
      )}

      <style jsx global>{`
        .esp-msg-page {
          max-width: 720px; margin: 0 auto; padding: 16px;
          display: flex; flex-direction: column;
          height: 100vh; min-height: 0;
        }
        .esp-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .esp-back {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.8125rem; color: var(--text-muted); text-decoration: none;
        }
        .esp-back:hover { color: var(--brand); }
        .esp-studio { margin-left: auto; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }

        .esp-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 1.25rem; font-weight: 700;
          margin-bottom: 14px;
        }

        .esp-list-wrap, .esp-chat-container {
          flex: 1; min-height: 0;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .esp-chat-wrap {
          flex: 1; min-height: 0;
          display: flex; flex-direction: column; gap: 10px;
        }
        .esp-chat-back {
          align-self: flex-start;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 6px 12px; border-radius: 99px;
          background: var(--bg-soft, #faf8f5); border: 1px solid var(--border);
          font-size: 0.75rem; color: var(--text-secondary);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
