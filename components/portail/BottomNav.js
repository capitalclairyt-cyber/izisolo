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
        .bnav-wrap {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 40;
          padding-bottom: env(safe-area-inset-bottom, 0); /* iOS notch */
          background: #fffbf5; /* crème chaud, ton studio bien-être */
          border-top: 1px solid #ecdfd5;
          box-shadow: 0 -4px 24px rgba(70, 35, 25, 0.08);
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
          color: #9a8985;
          text-decoration: none;
          cursor: pointer;
          padding: 6px 4px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.02em;
          transition: color .2s;
          line-height: 1;
        }
        .bnav-btn:hover { color: #d4a0a0; }

        /* Pastille active : pill brand-light derrière l'icône */
        .bnav-btn.is-active {
          color: #b87575;
          font-weight: 600;
        }
        .bnav-btn.is-active .bnav-ico::before {
          content: '';
          position: absolute;
          inset: -6px -10px;
          background: #fce8e8;
          border-radius: 999px;
          z-index: -1;
        }

        .bnav-ico {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
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
          border-radius: 99px; border: 2px solid #fffbf5;
          font-size: 0.6875rem; font-weight: 700; line-height: 1;
          display: inline-flex; align-items: center; justify-content: center;
          z-index: 2;
        }

        /* Bouton + central : plus présent, accent rose */
        .bnav-plus {
          width: 52px; height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, #d4a0a0 0%, #c08585 100%);
          color: white;
          border: 3px solid #fffbf5;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          justify-self: center;
          box-shadow:
            0 4px 12px rgba(212, 160, 160, 0.45),
            0 1px 3px rgba(30, 20, 25, 0.10);
          transition: transform .2s, box-shadow .2s;
          text-decoration: none;
          margin-top: -16px; /* déborde au-dessus de la barre pour effet FAB */
        }
        .bnav-plus:hover {
          transform: scale(1.06);
          box-shadow:
            0 6px 18px rgba(212, 160, 160, 0.55),
            0 2px 6px rgba(30, 20, 25, 0.12);
        }
        .bnav-plus:active { transform: scale(0.96); }

        /* Hidden on desktop */
        @media (min-width: 769px) {
          .bnav-wrap { display: none; }
        }
      `}</style>
    </div>
  );
}
