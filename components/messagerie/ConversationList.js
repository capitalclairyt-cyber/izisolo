'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Users, User } from 'lucide-react';

/**
 * ConversationList — liste des conversations du viewer (pro ou élève).
 *
 * Props :
 *   onSelect(conversationId) — callback au click sur une conversation
 *   selectedId — id de la conv actuellement sélectionnée (highlight)
 *   onCounts(counts) — callback {total, unread} pour afficher dans la nav
 */
export default function ConversationList({ onSelect, selectedId, onCounts }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch('/api/messagerie/conversations');
      const json = await res.json();
      const convs = json.conversations || [];
      setConversations(convs);
      const unread = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      onCounts?.({ total: convs.length, unread });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [onCounts]);

  useEffect(() => {
    fetchConvs();
    const interval = setInterval(fetchConvs, 8000);
    return () => clearInterval(interval);
  }, [fetchConvs]);

  if (loading) {
    return (
      <div className="cl-loading">
        <Loader2 size={16} className="spin" /> Chargement…
        <style>{`
          .cl-loading { display: flex; align-items: center; gap: 8px; padding: 24px; color: var(--text-muted); font-size: 0.875rem; }
          @keyframes cl-spin { to { transform: rotate(360deg); } }
          .spin { animation: cl-spin 0.8s linear infinite; }
        `}</style>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="cl-empty">
        <div className="cl-empty-icon"><User size={28} /></div>
        <p className="cl-empty-title">Aucune conversation</p>
        <p className="cl-empty-desc">
          Démarre un échange avec un élève depuis sa fiche, ou envoie une annonce groupée depuis l'onglet "Annoncer".
        </p>
        <style>{`
          .cl-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 20px; text-align: center; }
          .cl-empty-icon { color: var(--text-muted); margin-bottom: 6px; }
          .cl-empty-title { font-weight: 600; color: var(--text-primary); }
          .cl-empty-desc { font-size: 0.8125rem; color: var(--text-muted); max-width: 320px; line-height: 1.4; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="conv-list">
      {conversations.map(c => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect?.(c.id)}
          className={`conv-item ${selectedId === c.id ? 'selected' : ''} ${c.unread_count > 0 ? 'unread' : ''}`}
        >
          <div className="conv-avatar">
            {c.type === 'cours' ? <Users size={18} /> : <User size={18} />}
          </div>
          <div className="conv-main">
            <div className="conv-top">
              <span className="conv-label">{c.peer_label}</span>
              <span className="conv-time">{formatRelative(c.last_message_at)}</span>
            </div>
            <div className="conv-bottom">
              <span className="conv-preview">
                {c.last_message_from === 'pro' && c.last_message_preview ? 'Toi : ' : ''}
                {c.last_message_preview || <em>Aucun message</em>}
              </span>
              {c.unread_count > 0 && (
                <span className="conv-badge">{c.unread_count}</span>
              )}
            </div>
          </div>
        </button>
      ))}

      <style>{`
        .conv-list { display: flex; flex-direction: column; }
        .conv-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; background: white;
          border: none; border-bottom: 1px solid var(--border);
          text-align: left; cursor: pointer; width: 100%;
          transition: background 0.1s;
        }
        .conv-item:hover { background: var(--bg-soft, #faf8f5); }
        .conv-item.selected { background: var(--brand-light); }
        .conv-item.unread .conv-label { font-weight: 700; }

        .conv-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--brand-light); color: var(--brand);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .conv-main { flex: 1; min-width: 0; }
        .conv-top {
          display: flex; justify-content: space-between; align-items: baseline;
          gap: 8px; margin-bottom: 2px;
        }
        .conv-label {
          font-size: 0.875rem; font-weight: 500; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .conv-time {
          font-size: 0.6875rem; color: var(--text-muted);
          flex-shrink: 0; font-variant-numeric: tabular-nums;
        }
        .conv-bottom {
          display: flex; justify-content: space-between; align-items: center;
          gap: 8px;
        }
        .conv-preview {
          font-size: 0.75rem; color: var(--text-muted);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          flex: 1;
        }
        .conv-badge {
          background: var(--brand); color: white;
          font-size: 0.6875rem; font-weight: 700;
          min-width: 18px; height: 18px;
          padding: 0 6px; border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

function formatRelative(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'à l\'instant';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
