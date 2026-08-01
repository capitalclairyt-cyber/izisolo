'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import MessageBubble, { DateSeparator } from './MessageBubble';
import ChatInput from './ChatInput';
import { Loader2, Pencil, Check, X, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/ToastProvider';
import EmptyState from '@/components/ui/EmptyState';

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

export default function ChatRoom({ conversationId, viewerKind, onMessageSent, initialText = '', onDeleted }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [reactionsByMsg, setReactionsByMsg] = useState({}); // { msgId: [{ emoji, mine }] }
  const [conv, setConv]         = useState(null); // {peer_label, titre, is_owner_pro}
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  // Suppression (pro uniquement) : confirmation INLINE — pas de ConfirmProvider,
  // ChatRoom est aussi monté côté espace élève qui n'en a pas.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const scrollRef = useRef(null);
  const lastFetchAt = useRef(null);
  const nearBottomRef = useRef(true);   // auto-scroll seulement si on est déjà en bas
  const lastMarkedAtRef = useRef(null); // created_at couvert par le dernier read réussi
  const reactionsSigRef = useRef('');   // signature d'ids — évite la tempête de GET réactions
  const lastReactionsAtRef = useRef(0);
  const messagesRef = useRef([]);
  const convRef = useRef(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const fetchConv = useCallback(async () => {
    try {
      const res = await fetch(`/api/messagerie/conversations/${conversationId}`);
      const json = await res.json();
      if (res.ok && json.conversation) setConv(json.conversation);
    } catch { /* ignore */ }
  }, [conversationId]);

  useEffect(() => { fetchConv(); }, [fetchConv]);
  useEffect(() => { convRef.current = conv; }, [conv]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/messagerie/conversations/${conversationId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      toast.success('Conversation supprimée.');
      onDeleted?.();
    } catch (err) {
      toast.error('Suppression impossible : ' + err.message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

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
      const fresh = json.messages || [];
      // Union par id : le poll ne renvoie que la dernière fenêtre de 100 —
      // on conserve l'historique chargé via « Messages précédents », et on
      // renvoie la même référence si rien n'a changé (évite les re-renders
      // en cascade toutes les 5 s).
      setMessages(prev => {
        const byId = new Map(prev.map(m => [m.id, m]));
        let changed = false;
        for (const m of fresh) {
          if (!byId.has(m.id)) changed = true;
          byId.set(m.id, m);
        }
        if (!changed) return prev;
        return [...byId.values()].sort((a, b) =>
          (a.created_at || '').localeCompare(b.created_at || ''));
      });
      if (fresh.length >= 100) setHasMore(true);
      setError(null);
      lastFetchAt.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Charge la page précédente de l'historique (la route supporte ?before=).
  const fetchOlder = useCallback(async () => {
    const oldest = messagesRef.current[0];
    if (!oldest?.created_at || loadingOlder) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el ? el.scrollHeight : 0;
    const prevTop = el ? el.scrollTop : 0;
    try {
      const res = await fetch(
        `/api/messagerie/conversations/${conversationId}/messages?limit=100&before=${encodeURIComponent(oldest.created_at)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      const older = json.messages || [];
      if (older.length < 100) setHasMore(false);
      if (older.length) {
        setMessages(prev => {
          const byId = new Map();
          for (const m of [...older, ...prev]) byId.set(m.id, m);
          return [...byId.values()].sort((a, b) =>
            (a.created_at || '').localeCompare(b.created_at || ''));
        });
        // Restaure la position de lecture après l'insertion en haut
        requestAnimationFrame(() => {
          const el2 = scrollRef.current;
          if (el2) el2.scrollTop = el2.scrollHeight - prevHeight + prevTop;
        });
      }
    } catch (err) {
      toast.error('Impossible de charger les messages précédents : ' + err.message);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, loadingOlder, toast]);

  // Fetch les réactions de chaque message en parallèle (best effort, non-bloquant)
  const fetchReactions = useCallback(async (msgIds) => {
    if (!msgIds?.length) return;
    try {
      const results = await Promise.all(
        msgIds.map(id =>
          fetch(`/api/messagerie/messages/${id}/reactions`)
            .then(r => r.ok ? r.json() : { reactions: [] })
            .then(j => [id, j.reactions || []])
            .catch(() => [id, []])
        )
      );
      const map = {};
      for (const [id, reactions] of results) map[id] = reactions;
      setReactionsByMsg(prev => ({ ...prev, ...map }));
    } catch { /* silencieux */ }
  }, []);

  // Refetch réactions : seulement si la liste de messages a changé, ou toutes
  // les 30 s (réactions posées par l'autre sur d'anciens messages). Avant :
  // ~100 GET en parallèle toutes les 5 s par conversation ouverte.
  const maybeFetchReactions = useCallback(() => {
    const ids = messagesRef.current.map(m => m.id).filter(Boolean);
    if (!ids.length) return;
    const sig = ids.join(',');
    const now = Date.now();
    if (sig === reactionsSigRef.current && now - lastReactionsAtRef.current < 30000) return;
    reactionsSigRef.current = sig;
    lastReactionsAtRef.current = now;
    fetchReactions(ids);
  }, [fetchReactions]);

  useEffect(() => { maybeFetchReactions(); }, [messages, maybeFetchReactions]);

  const handleReact = async (messageId, emoji) => {
    // Snapshot avant pour rollback éventuel
    const previousState = reactionsByMsg[messageId] || [];

    // Optimistic update : toggle local
    setReactionsByMsg(prev => {
      const existing = prev[messageId] || [];
      const mineIdx = existing.findIndex(r => r.mine && r.emoji === emoji);
      if (mineIdx >= 0) {
        const next = [...existing];
        next.splice(mineIdx, 1);
        return { ...prev, [messageId]: next };
      }
      return { ...prev, [messageId]: [...existing, { emoji, mine: true }] };
    });

    try {
      const res = await fetch(`/api/messagerie/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!res.ok) {
        // Rollback : restaure l'état précédent + toast d'erreur
        setReactionsByMsg(prev => ({ ...prev, [messageId]: previousState }));
        let errMsg = 'Erreur sur la réaction';
        try {
          const json = await res.json();
          if (json?.error) errMsg = json.error;
          // Détection d'une migration manquante (table absente)
          if (/relation.*does not exist|messages_reactions/i.test(json?.error || '')) {
            errMsg = 'Les réactions ne sont pas encore activées (migration v48 à appliquer).';
          }
        } catch { /* response non JSON */ }
        toast.error(errMsg);
        return;
      }
      // Refetch pour la source de vérité
      fetchReactions([messageId]);
    } catch (err) {
      setReactionsByMsg(prev => ({ ...prev, [messageId]: previousState }));
      toast.error('Connexion impossible — réessaie dans un instant.');
    }
  };

  // Marquage lu — au chargement ET quand de nouveaux messages arrivent alors
  // que la conversation est OUVERTE (avant : au mount uniquement → le badge
  // « non lu » continuait de grimper pendant qu'on lisait). res.ok vérifié :
  // un échec est retenté au prochain message ou au prochain poll.
  const markReadUpTo = useCallback(() => {
    const msgs = messagesRef.current;
    const last = msgs[msgs.length - 1];
    if (!last?.created_at) return;
    if (lastMarkedAtRef.current && last.created_at <= lastMarkedAtRef.current) return;
    const upTo = last.created_at;
    fetch(`/api/messagerie/conversations/${conversationId}/read`, { method: 'POST' })
      .then(res => { if (res.ok) lastMarkedAtRef.current = upTo; })
      .catch(() => {});
  }, [conversationId]);

  // Initial load
  useEffect(() => { fetchMessages(); }, [conversationId, fetchMessages]);
  useEffect(() => { markReadUpTo(); }, [messages, markReadUpTo]);

  // Polling — messages + réactions (throttlées) + retry read + header raté
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
      maybeFetchReactions();
      markReadUpTo();
      if (!convRef.current) fetchConv();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchMessages, maybeFetchReactions, markReadUpTo, fetchConv]);

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

  // Auto-scroll vers le bas — seulement si on était déjà en bas (sinon un
  // message arrivé pendant la lecture de l'historique téléportait l'écran).
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = async ({ content, mediaUrls }) => {
    const medias = mediaUrls || [];
    // Un PDF n'est pas une « photo » : les aperçus (liste, digest) s'appuient
    // sur message_type. Même heuristique que MessageBubble/lib/messagerie.
    const imgRx = /\.(jpe?g|png|gif|webp|heic|avif)(\?|#|$)/i;
    const messageType = medias.length === 0 ? 'text'
      : medias.every(u => imgRx.test(typeof u === 'string' ? u : (u?.url || ''))) ? 'photo' : 'file';
    const res = await fetch(`/api/messagerie/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        message_type: messageType,
        media_urls: medias,
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
              {conv.is_owner_pro && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="cr-title-btn"
                  title="Supprimer la conversation"
                  aria-label="Supprimer la conversation"
                  style={{ marginLeft: 'auto' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
          {confirmDelete && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
              marginTop: 8, padding: '10px 12px', borderRadius: 10,
              background: '#fdf2f2', border: '1px solid #f0c4c4',
              fontSize: '0.8125rem', color: '#7a3b3b', lineHeight: 1.45,
            }}>
              <span style={{ flex: 1, minWidth: 180 }}>
                Supprimer cette conversation ? Les messages seront effacés
                <strong> pour toi ET pour l'élève</strong> — définitif.
              </span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{ padding: '6px 12px', borderRadius: 99, border: '1px solid var(--border, #e5e0dc)', background: 'white', cursor: 'pointer', fontSize: '0.8125rem' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{ padding: '6px 12px', borderRadius: 99, border: 'none', background: '#c04545', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                {deleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                Supprimer
              </button>
            </div>
          )}
        </div>
      )}

      <div ref={scrollRef} onScroll={handleScroll} className={`cr-scroll ${messages.length === 0 ? 'is-empty' : ''}`}>
        {hasMore && messages.length > 0 && (
          <button type="button" className="cr-older" onClick={fetchOlder} disabled={loadingOlder}>
            {loadingOlder ? 'Chargement…' : '↑ Messages précédents'}
          </button>
        )}
        {messages.length === 0 ? (
          <EmptyState
            title="Aucun message pour le moment."
            description="Lance la conversation !"
          />
        ) : (
          messages.map((m, i) => (
            <div key={m.id}>
              {(i === 0 || !isSameDay(m.created_at, messages[i - 1].created_at)) && (
                <DateSeparator date={m.created_at} />
              )}
              <MessageBubble
                message={m}
                viewerKind={viewerKind}
                reactions={reactionsByMsg[m.id] || []}
                onReact={(emoji) => handleReact(m.id, emoji)}
              />
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="cr-error">⚠ {error}</div>
      )}

      <ChatInput onSend={handleSend} initialText={initialText} />

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
        /* Quand pas de messages : empty state ancré en bas (proche de l'input)
           au lieu d'être collé en haut. Pattern type WhatsApp/Slack. */
        .cr-scroll.is-empty {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .cr-empty {
          text-align: center; padding: 16px 20px 8px;
          color: var(--text-muted); font-size: 0.875rem;
        }
        .cr-empty-sub { font-size: 0.75rem; margin-top: 4px; opacity: 0.7; }

        .cr-error {
          padding: 8px 12px;
          background: #fee2e2; color: #991b1b;
          font-size: 0.8125rem; border-top: 1px solid #fecaca;
        }
        .cr-older {
          display: block; margin: 0 auto 10px;
          padding: 6px 14px; border-radius: 99px;
          background: white; border: 1px solid var(--border);
          font-size: 0.75rem; color: var(--text-secondary); cursor: pointer;
        }
        .cr-older:hover:not(:disabled) { color: var(--brand); border-color: var(--brand); }
        .cr-older:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </div>
  );
}
