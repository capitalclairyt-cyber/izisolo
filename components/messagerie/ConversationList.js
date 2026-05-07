'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Users, User, Megaphone, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import Pagination, { usePagination } from '@/components/ui/Pagination';

/**
 * ConversationList — liste des conversations du viewer (pro ou élève).
 *
 * Côté pro : groupe les conversations encore "annonces non répondues" sous une
 * seule ligne pliable (📢 Annonce · X destinataires). Dès qu'un élève répond,
 * sa conv sort du groupe et apparaît standalone.
 *
 * Props :
 *   onSelect(conversationId) — callback au click sur une conversation
 *   selectedId — id de la conv actuellement sélectionnée (highlight)
 *   onCounts(counts) — callback {total, unread} pour afficher dans la nav
 */
export default function ConversationList({ onSelect, selectedId, onCounts }) {
  const [conversations, setConversations] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const fetchConvs = useCallback(async () => {
    try {
      const res = await fetch('/api/messagerie/conversations');
      const json = await res.json();
      const convs = json.conversations || [];
      setConversations(convs);
      setViewer(json.viewer || null);
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

  // Grouper les conversations annonces non répondues (pro uniquement)
  const items = useMemo(() => {
    if (viewer !== 'pro') {
      // Côté élève : pas de grouping, juste tri par date
      return conversations.map(c => ({ kind: 'conv', data: c, ts: c.last_message_at }));
    }
    const groups = new Map();
    const standalone = [];
    for (const c of conversations) {
      if (c.last_announce_batch_id) {
        const g = groups.get(c.last_announce_batch_id) || {
          batch_id: c.last_announce_batch_id,
          convs: [],
          last_message_at: c.last_message_at,
          last_message_preview: c.last_message_preview,
          read_count: 0,
        };
        g.convs.push(c);
        // recipient a-t-il lu ? eleve_last_read_at >= last_message_at
        if (c.eleve_last_read_at && c.last_message_at &&
            new Date(c.eleve_last_read_at) >= new Date(c.last_message_at)) {
          g.read_count++;
        }
        // Garder la date max du batch
        if (c.last_message_at > g.last_message_at) g.last_message_at = c.last_message_at;
        groups.set(c.last_announce_batch_id, g);
      } else {
        standalone.push(c);
      }
    }
    const list = [
      ...standalone.map(c => ({ kind: 'conv', data: c, ts: c.last_message_at })),
      ...Array.from(groups.values()).map(g => ({
        kind: 'group',
        data: g,
        ts: g.last_message_at,
      })),
    ];
    return list.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  }, [conversations, viewer]);

  const { paginated, currentPage, totalPages, setPage } = usePagination(items, 8);

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
          {viewer === 'pro'
            ? "Démarre un échange avec un élève depuis sa fiche, ou envoie une annonce groupée depuis l'onglet \"Annoncer\"."
            : "Tu n'as pas encore reçu de message."}
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

  const toggleGroup = (batchId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  };

  return (
    <div className="conv-list">
      {paginated.map(item => {
        if (item.kind === 'group') {
          const g = item.data;
          const expanded = expandedGroups.has(g.batch_id);
          return (
            <div key={`group-${g.batch_id}`} className="conv-group">
              <button
                type="button"
                onClick={() => toggleGroup(g.batch_id)}
                className="conv-item conv-group-header"
              >
                <div className="conv-avatar conv-avatar-announce">
                  <Megaphone size={18} />
                </div>
                <div className="conv-main">
                  <div className="conv-top">
                    <span className="conv-label">
                      Annonce <span className="conv-recip-count">· {g.convs.length} destinataire{g.convs.length > 1 ? 's' : ''}</span>
                    </span>
                    <span className="conv-time">{formatRelative(g.last_message_at)}</span>
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-preview">
                      {g.last_message_preview || <em>Aucun aperçu</em>}
                    </span>
                    <span className="conv-group-stats">
                      <Eye size={11} /> {g.read_count}/{g.convs.length}
                    </span>
                  </div>
                </div>
                <div className="conv-chevron">
                  {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>
              {expanded && (
                <div className="conv-group-body">
                  {g.convs.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelect?.(c.id)}
                      className={`conv-item conv-item-nested ${selectedId === c.id ? 'selected' : ''}`}
                    >
                      <div className="conv-avatar conv-avatar-small">
                        <User size={14} />
                      </div>
                      <div className="conv-main">
                        <div className="conv-top">
                          <span className="conv-label">{c.peer_label}</span>
                          <span className="conv-recip-status">
                            {c.eleve_last_read_at && c.last_message_at &&
                             new Date(c.eleve_last_read_at) >= new Date(c.last_message_at)
                              ? <span className="status-read">Lu</span>
                              : <span className="status-unread">Non lu</span>}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // kind = 'conv'
        const c = item.data;
        return (
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
        );
      })}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={setPage}
        label="conversations"
      />

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
        .conv-avatar-announce {
          background: #fff8e1; color: #d97706;
        }
        .conv-avatar-small {
          width: 28px; height: 28px;
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
        .conv-recip-count {
          font-weight: 400; color: var(--text-muted); font-size: 0.8125rem;
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
        .conv-group-stats {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 0.6875rem; color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .conv-chevron {
          color: var(--text-muted); flex-shrink: 0;
        }
        .conv-group-body {
          background: var(--bg-soft, #faf8f5);
          border-bottom: 1px solid var(--border);
        }
        .conv-item-nested {
          padding: 8px 14px 8px 30px;
          background: transparent;
          border-bottom: 1px dashed var(--border);
        }
        .conv-item-nested:last-child { border-bottom: none; }
        .conv-recip-status .status-read {
          font-size: 0.6875rem; color: #2e7d32; background: #e8f5e9;
          padding: 2px 8px; border-radius: 99px; font-weight: 500;
        }
        .conv-recip-status .status-unread {
          font-size: 0.6875rem; color: #888; background: #f5f5f5;
          padding: 2px 8px; border-radius: 99px; font-weight: 500;
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
