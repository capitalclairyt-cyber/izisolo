'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble, { DateSeparator } from './MessageBubble';
import ChatInput from './ChatInput';
import { Loader2, Pencil, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';

/**
 * ChatRoom — affiche les messages d'une conversation + input.
 * Polling 5s + realtime Supabase si dispo.
 *
 * Props :
 *   conversationId
 *   viewerKind : 'pro' | 'eleve'
 *   onMessageSent (optionnel)
 */

const POLL_INTERVAL = 5000;

function isSameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export default function ChatRoom({ conversationId, viewerKind, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [conv, setConv]         = useState(null); // {peer_label, titre, is_owner_pro}
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const scrollRef = useRef(null);
  const lastFetchAt = useRef(null);

  const fetchConv = useCallback(async () => {
    try {
      const res = await fetch(`/api/messagerie/conversations/${conversationId}`);
      const json = await res.json();
      if (res.ok && json.conversation) setConv(json.conversation);
    } catch { /* ignore */ }
  }, [conversationId]);

  useEffect(() => { fetchConv(); }, [fetchConv]);

  const handleSaveTitle = async () => {
    setSavingTitle(true);
    try {
      const res = await fetch(`/api/messagerie/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: titleDraft.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      // Refresh conv pour récupérer le nouveau peer_label dérivé
      await fetchConv();
      setEditingTitle(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingTitle(false);
    }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messagerie/conversations/${conversationId}/messages?limit=100`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setMessages(json.messages || []);
      setError(null);
      lastFetchAt.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Initial load + mark as read
  useEffect(() => {
    fetchMessages();
    fetch(`/api/messagerie/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {});
  }, [conversationId, fetchMessages]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Realtime via Supabase (en plus du polling)
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetchMessages]);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async ({ content, mediaUrls }) => {
    const isPhoto = mediaUrls && mediaUrls.length > 0;
    const res = await fetch(`/api/messagerie/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        message_type: isPhoto ? 'photo' : 'text',
        media_urls: mediaUrls || [],
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erreur');
    await fetchMessages();
    onMessageSent?.(json.message);
  };

  if (loading) {
    return (
      <div className="cr-loading">
        <Loader2 size={20} className="spin" /> Chargement…
        <style>{`
          .cr-loading {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            padding: 40px; color: var(--text-muted); font-size: 0.875rem;
          }
          @keyframes cr-spin { to { transform: rotate(360deg); } }
          .spin { animation: cr-spin 0.8s linear infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-room">
      {/* Header conv : titre + édition pro */}
      {conv && (
        <div className="cr-header">
          {editingTitle ? (
            <div className="cr-title-edit">
              <input
                type="text"
                className="cr-title-input"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                placeholder={conv.peer_label}
                maxLength={200}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                disabled={savingTitle}
                className="cr-title-btn cr-title-btn-save"
                title="Enregistrer"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => setEditingTitle(false)}
                className="cr-title-btn"
                title="Annuler"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="cr-title-row">
              <span className="cr-title">{conv.peer_label}</span>
              {conv.is_owner_pro && (
                <button
                  type="button"
                  onClick={() => { setTitleDraft(conv.titre || ''); setEditingTitle(true); }}
                  className="cr-title-btn"
                  title="Renommer"
                  aria-label="Renommer la conversation"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div ref={scrollRef} className="cr-scroll">
        {messages.length === 0 ? (
          <div className="cr-empty">
            <div>Aucun message pour le moment.</div>
            <div className="cr-empty-sub">Lance la conversation !</div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={m.id}>
              {(i === 0 || !isSameDay(m.created_at, messages[i - 1].created_at)) && (
                <DateSeparator date={m.created_at} />
              )}
              <MessageBubble message={m} viewerKind={viewerKind} />
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="cr-error">⚠ {error}</div>
      )}

      <ChatInput onSend={handleSend} />

      <style jsx global>{`
        .chat-room {
          display: flex; flex-direction: column;
          height: 100%; min-height: 0;
        }
        .cr-header {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          background: white;
          flex-shrink: 0;
        }
        .cr-title-row {
          display: flex; align-items: center; gap: 8px;
        }
        .cr-title {
          font-size: 0.9375rem; font-weight: 600;
          color: var(--text-primary);
          flex: 1; min-width: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cr-title-edit {
          display: flex; align-items: center; gap: 4px;
        }
        .cr-title-input {
          flex: 1;
          padding: 6px 10px; border: 1.5px solid var(--brand);
          border-radius: 8px; font-size: 0.9375rem; font-weight: 600;
          outline: none; min-width: 0;
        }
        .cr-title-btn {
          width: 28px; height: 28px; flex-shrink: 0;
          display: inline-flex; align-items: center; justify-content: center;
          background: white; border: 1px solid var(--border); border-radius: 6px;
          color: var(--text-muted); cursor: pointer; transition: all 0.1s;
        }
        .cr-title-btn:hover {
          color: var(--brand); border-color: var(--brand);
        }
        .cr-title-btn-save {
          background: var(--brand); color: white; border-color: var(--brand);
        }
        .cr-title-btn-save:hover {
          background: var(--brand); opacity: 0.9; color: white;
        }
        .cr-title-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cr-scroll {
          flex: 1; overflow-y: auto;
          padding: 12px;
          background: var(--bg-card);
        }
        .cr-empty {
          text-align: center; padding: 40px 20px;
          color: var(--text-muted); font-size: 0.875rem;
        }
        .cr-empty-sub { font-size: 0.75rem; margin-top: 4px; opacity: 0.7; }

        .cr-error {
          padding: 8px 12px;
          background: #fee2e2; color: #991b1b;
          font-size: 0.8125rem; border-top: 1px solid #fecaca;
        }
      `}</style>
    </div>
  );
}
