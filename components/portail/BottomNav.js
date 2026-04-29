'use client';

/**
 * BottomNav (style Claude Design) — pilule blanche flottante avec bouton +
 * central, pour la partie élève /p/[slug]/*.
 *
 * Layout : 5 colonnes grid — [Cours] [Espace] [+ Réserver] [Messages] [Profil]
 * Le + central est un FAB noir qui linke vers la liste des cours pour
 * encourager la réservation (action primaire de l'élève).
 *
 * Mobile only (≤768px). Visible uniquement si élève connecté.
 *
 * Style hérité du designer Claude (pattern .np-dock) mais adapté aux variables
 * CSS existantes — pas d'oklch ni dépendance au design system np-* reverted.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, MessageCircle, Plus, CalendarDays } from 'lucide-react';

export default function BottomNav({ studioSlug, unread = 0 }) {
  const pathname = usePathname();

  const isActiveExact = (path) => pathname === path;
  const isActiveStarts = (prefix) => pathname.startsWith(prefix);

  return (
    <div className="bnav-wrap" aria-label="Navigation principale">
      <nav className="bnav-bar">
        <Link
          href={`/p/${studioSlug}`}
          className={`bnav-btn ${isActiveExact(`/p/${studioSlug}`) ? 'is-active' : ''}`}
          aria-label="Accueil — cours du studio"
        >
          <span className="bnav-ico">
            <Home size={22} strokeWidth={isActiveExact(`/p/${studioSlug}`) ? 1.7 : 1.4} />
          </span>
          <span className="bnav-lbl">Cours</span>
        </Link>

        <Link
          href={`/p/${studioSlug}/espace`}
          className={`bnav-btn ${isActiveExact(`/p/${studioSlug}/espace`) ? 'is-active' : ''}`}
          aria-label="Mon espace"
        >
          <span className="bnav-ico">
            <CalendarDays size={22} strokeWidth={isActiveExact(`/p/${studioSlug}/espace`) ? 1.7 : 1.4} />
          </span>
          <span className="bnav-lbl">Espace</span>
        </Link>

        {/* Bouton + central — Réserver */}
        <Link
          href={`/p/${studioSlug}`}
          className="bnav-plus"
          aria-label="Réserver un cours"
        >
          <Plus size={22} strokeWidth={1.7} />
        </Link>

        <Link
          href={`/p/${studioSlug}/espace/messages`}
          className={`bnav-btn ${isActiveStarts(`/p/${studioSlug}/espace/messages`) ? 'is-active' : ''}`}
          aria-label={`Messages${unread > 0 ? ` (${unread} non lus)` : ''}`}
        >
          <span className="bnav-ico">
            <MessageCircle size={22} strokeWidth={isActiveStarts(`/p/${studioSlug}/espace/messages`) ? 1.7 : 1.4} />
            {unread > 0 && (
              <span className="bnav-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </span>
          <span className="bnav-lbl">Messages</span>
        </Link>

        <Link
          href={`/p/${studioSlug}/espace`}
          className={`bnav-btn ${isActiveExact(`/p/${studioSlug}/mes-credits`) ? 'is-active' : ''}`}
          aria-label="Mon profil"
        >
          <span className="bnav-ico">
            <User size={22} strokeWidth={isActiveExact(`/p/${studioSlug}/mes-credits`) ? 1.7 : 1.4} />
          </span>
          <span className="bnav-lbl">Profil</span>
        </Link>
      </nav>

      <style jsx global>{`
        .bnav-wrap {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          padding: 12px 16px calc(18px + env(safe-area-inset-bottom, 0));
          z-index: 40;
          background: linear-gradient(to top, #faf8f5 30%, transparent);
          pointer-events: none;
        }
        .bnav-bar {
          pointer-events: auto;
          background: white;
          border-radius: 999px;
          height: 56px;
          display: grid;
          grid-template-columns: 1fr 1fr 56px 1fr 1fr;
          align-items: center;
          padding: 0 6px;
          box-shadow:
            0 8px 28px rgba(30, 20, 25, 0.10),
            0 2px 6px rgba(30, 20, 25, 0.04);
          border: 1px solid #f0ebe8;
        }
        .bnav-btn {
          height: 100%;
          background: none; border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: #888;
          text-decoration: none;
          cursor: pointer;
          padding: 6px 4px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color .15s;
          line-height: 1;
        }
        .bnav-btn:hover { color: #d4a0a0; }
        .bnav-btn.is-active {
          color: #1a1a2e;
          font-weight: 600;
        }
        .bnav-ico {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .bnav-lbl {
          line-height: 1;
          display: block;
        }
        .bnav-badge {
          position: absolute;
          top: -4px; right: -8px;
          min-width: 16px; height: 16px;
          padding: 0 4px;
          background: #dc2626; color: white;
          border-radius: 99px; border: 2px solid white;
          font-size: 0.625rem; font-weight: 700; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
        }
        .bnav-plus {
          width: 44px; height: 44px;
          border-radius: 50%;
          background: #1a1a2e;
          color: #fafafa;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          justify-self: center;
          box-shadow: 0 4px 12px rgba(30, 20, 25, 0.20);
          transition: transform .15s, background .15s;
          text-decoration: none;
        }
        .bnav-plus:hover {
          transform: scale(1.05);
          background: #2d2d44;
          color: white;
        }
        .bnav-plus:active { transform: scale(0.94); }

        /* Hidden on desktop */
        @media (min-width: 769px) {
          .bnav-wrap { display: none; }
        }
      `}</style>
    </div>
  );
}
