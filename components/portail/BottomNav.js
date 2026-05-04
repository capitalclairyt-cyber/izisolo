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
            <Home size={23} strokeWidth={isActiveExact(`/p/${studioSlug}`) ? 1.7 : 1.4} />
          </span>
          <span className="bnav-lbl">Cours</span>
        </Link>

        <Link
          href={`/p/${studioSlug}/espace`}
          className={`bnav-btn ${isActiveExact(`/p/${studioSlug}/espace`) ? 'is-active' : ''}`}
          aria-label="Mon espace"
        >
          <span className="bnav-ico">
            <CalendarDays size={23} strokeWidth={isActiveExact(`/p/${studioSlug}/espace`) ? 1.7 : 1.4} />
          </span>
          <span className="bnav-lbl">Espace</span>
        </Link>

        {/* Bouton + central — Réserver */}
        <Link
          href={`/p/${studioSlug}`}
          className="bnav-plus"
          aria-label="Réserver un cours"
        >
          <Plus size={23} strokeWidth={1.7} />
        </Link>

        <Link
          href={`/p/${studioSlug}/espace/messages`}
          className={`bnav-btn ${isActiveStarts(`/p/${studioSlug}/espace/messages`) ? 'is-active' : ''}`}
          aria-label={`Messages${unread > 0 ? ` (${unread} non lus)` : ''}`}
        >
          <span className="bnav-ico">
            <MessageCircle size={23} strokeWidth={isActiveStarts(`/p/${studioSlug}/espace/messages`) ? 1.7 : 1.4} />
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
            <User size={23} strokeWidth={isActiveExact(`/p/${studioSlug}/mes-credits`) ? 1.7 : 1.4} />
          </span>
          <span className="bnav-lbl">Profil</span>
        </Link>
      </nav>

      <style jsx global>{`
        /* Palette Claude Design : crème (#faf6f0) + noir (#1a1612) — sobre, chaude, pas saturée. */
        .bnav-wrap {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 40;
          padding-bottom: env(safe-area-inset-bottom, 0);
          background: #faf6f0;
          border-top: 1px solid #ecdfd5;
          box-shadow: 0 -4px 24px rgba(70, 35, 25, 0.06);
        }
        .bnav-bar {
          height: 68px;
          display: grid;
          grid-template-columns: 1fr 1fr 60px 1fr 1fr;
          align-items: center;
          padding: 0 8px;
        }
        .bnav-btn {
          position: relative;
          height: 100%;
          background: none; border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: #a89c93; /* gris-beige muted */
          text-decoration: none;
          cursor: pointer;
          padding: 6px 4px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: color .2s;
          line-height: 1;
        }
        .bnav-btn:hover { color: #1a1612; }
        .bnav-btn.is-active {
          color: #1a1612; /* noir warm de Claude Design */
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
          min-width: 17px; height: 17px;
          padding: 0 4px;
          background: #dc2626; color: white;
          border-radius: 99px; border: 2px solid #faf6f0;
          font-size: 0.6875rem; font-weight: 700; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
        }

        /* FAB central : noir warm Claude Design, déborde au-dessus de la barre */
        .bnav-plus {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: #1a1612;
          color: #faf6f0;
          border: 3px solid #faf6f0;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          justify-self: center;
          box-shadow:
            0 4px 14px rgba(30, 20, 15, 0.20),
            0 1px 3px rgba(30, 20, 15, 0.08);
          transition: transform .2s;
          text-decoration: none;
          margin-top: -16px;
        }
        .bnav-plus:hover { transform: scale(1.06); }
        .bnav-plus:active { transform: scale(0.96); }

        @media (min-width: 769px) {
          .bnav-wrap { display: none; }
        }
      `}</style>
    </div>
  );
}
