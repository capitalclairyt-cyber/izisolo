'use client';

import { useEffect, useState } from 'react';

/**
 * MessagesBadge — petite pastille rouge avec compteur de non-lus.
 * À placer à côté de l'icône Messagerie dans la nav.
 *
 * Polling 90s, suspendu onglet caché, rattrapé au retour (AUDIT-PERF cat 1.3 :
 * ce badge est monté sur TOUTES les pages dashboard — c'était, multiplié par
 * countUnread N+1, le premier poste de charge DB projeté). Pas de realtime
 * ici (overkill pour un badge).
 */
export default function MessagesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/messagerie/unread');
        if (!res.ok) return; // erreur serveur : on garde le compteur affiché
        const json = await res.json();
        if (!cancelled && typeof json.count === 'number') setCount(json.count);
      } catch {
        // réseau : compteur précédent conservé
      }
    };
    fetchCount();
    const interval = setInterval(() => { if (!document.hidden) fetchCount(); }, 90000);
    const onVisible = () => { if (!document.hidden) fetchCount(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="msg-badge" aria-label={`${count} message${count > 1 ? 's' : ''} non lu${count > 1 ? 's' : ''}`}>
      {count > 99 ? '99+' : count}
      <style>{`
        .msg-badge {
          position: absolute;
          top: -4px; right: -4px;
          min-width: 16px; height: 16px;
          padding: 0 5px;
          background: #dc2626; color: white;
          font-size: 0.625rem; font-weight: 700;
          border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid white;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </span>
  );
}
