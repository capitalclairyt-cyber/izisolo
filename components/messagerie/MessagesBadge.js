'use client';

import { useEffect, useState } from 'react';

/**
 * MessagesBadge — petite pastille rouge avec compteur de non-lus.
 * À placer à côté de l'icône Messagerie dans la nav.
 *
 * Polling 30s. Pas de realtime ici (overkill pour un badge).
 */
export default function MessagesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/messagerie/unread');
        const json = await res.json();
        if (!cancelled) setCount(json.count || 0);
      } catch {
        // ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => { cancelled = true; clearInterval(interval); };
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
