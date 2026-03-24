'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, CheckCheck, ExternalLink, Gift, Send } from 'lucide-react';

const TYPE_CONFIG = {
  anniversaire:     { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  paiement_retard:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  carnet_epuise:    { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  abonnement_expire:{ color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  nouveau_client:   { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return "À l'instant";
  if (mins < 60)  return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}

export default function NotificationBell() {
  const router  = useRouter();
  const [notifs, setNotifs]     = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const panelRef  = useRef(null);
  const bellRef   = useRef(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  const unreadCount = notifs.filter(n => !n.lu).length;

  // ── Charger les notifs ────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/notifications/check', { method: 'POST' });
      const { notifications } = await res.json();
      setNotifs(notifications || []);
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  }, []);

  // Au montage + toutes les 5 minutes
  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(() => fetchNotifs(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Fermer le panel au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ── Marquer comme lu ─────────────────────────────────────────────────────
  const markRead = async (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
  };

  const markAllRead = async () => {
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
  };

  // ── Actions par type ─────────────────────────────────────────────────────
  const handleAction = async (notif, action) => {
    await markRead(notif.id);
    setOpen(false);

    if (notif.type === 'anniversaire' && action === 'message') {
      router.push(`/communication?client_id=${notif.data.client_id}&preset=anniversaire`);
    } else if (notif.type === 'paiement_retard' && action === 'voir') {
      router.push(`/revenus`);
    } else if (notif.type === 'nouveau_client' && action === 'voir') {
      router.push(`/clients/${notif.data.client_id}`);
    } else if ((notif.type === 'carnet_epuise' || notif.type === 'abonnement_expire') && action === 'voir') {
      router.push(`/clients/${notif.data.client_id}`);
    }
  };

  const NotifCard = ({ notif }) => {
    const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.paiement_retard;
    const isUnread = !notif.lu;

    return (
      <div className={`nb-card ${isUnread ? 'unread' : ''}`}
           style={{ '--nb-color': cfg.color, '--nb-bg': cfg.bg, '--nb-border': cfg.border }}>
        {isUnread && <div className="nb-unread-dot" />}

        <div className="nb-card-body">
          <div className="nb-card-titre">{notif.titre}</div>
          {notif.corps && <div className="nb-card-corps">{notif.corps}</div>}
          <div className="nb-card-time">{timeAgo(notif.created_at)}</div>
        </div>

        <div className="nb-card-actions">
          {/* Actions spécifiques */}
          {notif.type === 'anniversaire' && (
            <button className="nb-action-btn primary"
                    onClick={() => handleAction(notif, 'message')}>
              <Send size={12} /> Envoyer
            </button>
          )}
          {(notif.type === 'paiement_retard' || notif.type === 'nouveau_client') && (
            <button className="nb-action-btn secondary"
                    onClick={() => handleAction(notif, 'voir')}>
              <ExternalLink size={12} /> Voir la fiche
            </button>
          )}
          {(notif.type === 'carnet_epuise' || notif.type === 'abonnement_expire') && (
            <button className="nb-action-btn secondary"
                    onClick={() => handleAction(notif, 'voir')}>
              <ExternalLink size={12} /> Voir l'élève
            </button>
          )}
          {/* Marquer lu */}
          {isUnread && (
            <button className="nb-action-btn ghost" onClick={() => markRead(notif.id)}
                    title="Marquer comme lu">
              <Check size={12} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="nb-root">
      {/* ── Bouton cloche ─────────────────────────────────────────────────── */}
      <button
        ref={bellRef}
        className={`nb-bell-btn ${open ? 'open' : ''} ${unreadCount > 0 ? 'has-notifs' : ''}`}
        onClick={() => {
          if (!open && bellRef.current) {
            const r = bellRef.current.getBoundingClientRect();
            setPanelPos({ top: r.bottom + 8, left: r.left });
          }
          setOpen(v => !v);
        }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
      >
        <Bell size={18} strokeWidth={unreadCount > 0 ? 2.2 : 1.8} />
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* ── Panel — rendu via Portal hors du sidebar (backdrop-filter piège position:fixed) */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="nb-panel animate-fade-in"
          ref={panelRef}
          style={{
            top:  panelPos.top,
            left: Math.min(panelPos.left, window.innerWidth - 336),
          }}
        >
          {/* Header */}
          <div className="nb-panel-header">
            <span className="nb-panel-title">
              Notifications
              {unreadCount > 0 && <span className="nb-panel-count">{unreadCount}</span>}
            </span>
            <div className="nb-panel-actions">
              {unreadCount > 0 && (
                <button className="nb-mark-all" onClick={markAllRead} title="Tout marquer comme lu">
                  <CheckCheck size={14} />
                </button>
              )}
              <button className="nb-close-btn" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Liste */}
          <div className="nb-list">
            {loading && notifs.length === 0 && (
              <div className="nb-empty">Chargement…</div>
            )}
            {!loading && notifs.length === 0 && (
              <div className="nb-empty">
                <Bell size={28} style={{ opacity: 0.2 }} />
                <span>Tout est à jour !</span>
              </div>
            )}
            {notifs.map(n => <NotifCard key={n.id} notif={n} />)}
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        .nb-root {
          position: relative;
        }

        /* ── Bouton ── */
        .nb-bell-btn {
          width: 34px; height: 34px;
          border-radius: 10px;
          border: 1.5px solid transparent;
          background: transparent;
          display: flex; align-items: center; justify-content: center;
          position: relative;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .nb-bell-btn:hover,
        .nb-bell-btn.open {
          background: var(--brand-light);
          color: var(--brand-700);
          border-color: var(--brand-light);
        }
        .nb-bell-btn.has-notifs {
          color: var(--brand-700);
          animation: bellShake 2.5s ease infinite;
        }
        @keyframes bellShake {
          0%, 80%, 100% { transform: rotate(0deg); }
          85% { transform: rotate(-12deg); }
          90% { transform: rotate(12deg); }
          95% { transform: rotate(-8deg); }
          98% { transform: rotate(5deg); }
        }

        /* Badge */
        .nb-badge {
          position: absolute;
          top: -3px; right: -3px;
          min-width: 16px; height: 16px;
          border-radius: 8px;
          background: #ef4444;
          color: white;
          font-size: 0.625rem;
          font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px;
          border: 1.5px solid white;
          line-height: 1;
        }

        /* ── Panel ──
           Toujours en position fixed pour échapper
           à l'overflow:hidden du sidebar                    */
        .nb-panel {
          position: fixed;
          width: 320px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg, 14px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.14);
          z-index: 9999;
          overflow: hidden;
          max-height: 480px;
          display: flex;
          flex-direction: column;
        }
        /* Sur mobile, occuper toute la largeur */
        @media (max-width: 600px) {
          .nb-panel {
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
          }
        }

        .nb-panel-header {
          padding: 12px 14px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .nb-panel-title {
          font-size: 0.875rem; font-weight: 700; color: var(--text-primary);
          display: flex; align-items: center; gap: 7px;
        }
        .nb-panel-count {
          background: #ef4444; color: white;
          font-size: 0.6875rem; font-weight: 800;
          padding: 1px 6px; border-radius: 10px;
        }
        .nb-panel-actions { display: flex; align-items: center; gap: 4px; }
        .nb-mark-all, .nb-close-btn {
          width: 28px; height: 28px;
          border-radius: 8px; border: none; background: none;
          cursor: pointer; color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .nb-mark-all:hover  { background: #dcfce7; color: #16a34a; }
        .nb-close-btn:hover { background: rgba(0,0,0,0.06); color: var(--text-primary); }

        /* ── Liste ── */
        .nb-list {
          overflow-y: auto; flex: 1;
          padding: 8px;
          display: flex; flex-direction: column; gap: 6px;
        }
        .nb-empty {
          padding: 28px 16px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          font-size: 0.875rem; color: var(--text-muted);
        }

        /* ── Carte notif ── */
        .nb-card {
          border-radius: 10px;
          border: 1px solid var(--nb-border, var(--border));
          background: var(--nb-bg, var(--bg-card));
          padding: 10px 12px;
          position: relative;
          transition: box-shadow 0.15s;
        }
        .nb-card.unread {
          border-color: var(--nb-border);
          box-shadow: inset 3px 0 0 var(--nb-color);
        }
        .nb-unread-dot {
          position: absolute; top: 10px; right: 10px;
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--nb-color);
        }
        .nb-card-titre {
          font-size: 0.8125rem; font-weight: 700; color: var(--text-primary);
          padding-right: 16px; line-height: 1.35;
        }
        .nb-card-corps {
          font-size: 0.75rem; color: var(--text-muted);
          margin-top: 3px; line-height: 1.4;
        }
        .nb-card-time {
          font-size: 0.6875rem; color: var(--text-muted);
          margin-top: 5px; opacity: 0.7;
        }
        .nb-card-actions {
          display: flex; gap: 5px; margin-top: 8px; flex-wrap: wrap;
        }
        .nb-action-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 6px;
          font-size: 0.75rem; font-weight: 600; cursor: pointer;
          border: 1.5px solid transparent; transition: all 0.15s;
        }
        .nb-action-btn.primary {
          background: var(--nb-color); color: white; border-color: var(--nb-color);
        }
        .nb-action-btn.primary:hover { opacity: 0.88; }
        .nb-action-btn.secondary {
          background: transparent; color: var(--nb-color); border-color: var(--nb-color);
        }
        .nb-action-btn.secondary:hover { background: var(--nb-bg); }
        .nb-action-btn.ghost {
          background: transparent; color: var(--text-muted); border-color: var(--border);
          padding: 4px 7px;
        }
        .nb-action-btn.ghost:hover { background: rgba(0,0,0,0.05); color: var(--text-primary); }

        @keyframes animate-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: animate-fade-in 0.15s ease; }
      `}</style>
    </div>
  );
}
