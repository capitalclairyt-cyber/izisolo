'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Plus, Loader } from 'lucide-react';
import ConversationList from '@/components/messagerie/ConversationList';
import ChatRoom from '@/components/messagerie/ChatRoom';
import { useToast } from '@/components/ui/ToastProvider';

export default function EspaceMessagesClient({ profile, studioSlug, client }) {
  const [selectedConvId, setSelectedConvId] = useState(null);
  const [starting, setStarting] = useState(false);
  const { toast } = useToast();

  const handleStartConv = async () => {
    setStarting(true);
    try {
      const res = await fetch('/api/messagerie/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'eleve', studio_slug: studioSlug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setSelectedConvId(json.conversation.id);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="esp-msg-page">
      <header className="esp-header">
        <Link href={`/p/${studioSlug}/espace`} className="esp-back" aria-label="Retour à mon espace">
          <ArrowLeft size={16} /> Mon espace
        </Link>
        <div className="esp-studio">{profile.studio_nom}</div>
      </header>

      <div className="esp-title-row">
        <h1 className="esp-title">
          <MessageSquare size={20} /> Mes messages
        </h1>
        {!selectedConvId && (
          <button
            type="button"
            onClick={handleStartConv}
            disabled={starting}
            className="esp-new-conv-btn"
          >
            {starting ? <Loader size={14} className="spin" /> : <Plus size={14} />}
            Nouveau message
          </button>
        )}
      </div>

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

        .esp-title-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 14px; flex-wrap: wrap;
        }
        .esp-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 1.25rem; font-weight: 700;
          margin: 0;
        }
        .esp-new-conv-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 99px;
          background: #d4a0a0; color: white; border: none;
          font-size: 0.8125rem; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .esp-new-conv-btn:hover:not(:disabled) { background: #c08080; }
        .esp-new-conv-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes esp-spin { to { transform: rotate(360deg); } }
        .esp-new-conv-btn .spin { animation: esp-spin 0.8s linear infinite; }

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
