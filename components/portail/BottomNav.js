'use client';

/**
 * BottomNav (style Claude Design) — pilule blanche flottante en bas du viewport.
 *
 * Pour la partie élève /p/[slug]/*, visible uniquement sur mobile (≤768px)
 * et seulement si l'élève est connecté.
 *
 * 3 onglets minimalistes :
 *   🏠 Cours    → /p/[slug]
 *   👤 Mon espace → /p/[slug]/espace
 *   💬 Messages   → /p/[slug]/espace/messages (badge non-lu rouge)
 *
 * Style hérité du designer Claude (pattern .np-dock) mais adapté aux variables
 * CSS existantes — pas de dépendance oklch ni du design system np-* reverted.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, User, MessageCircle } from 'lucide-react';

export default function BottomNav({ studioSlug, unread = 0 }) {
  const pathname = usePathname();

  const items = [
    {
      href: `/p/${studioSlug}`,
      icon: Home,
      label: 'Cours',
      isActive: (path) => path === `/p/${studioSlug}`,
    },
    {
      href: `/p/${studioSlug}/espace`,
      icon: User,
      label: 'Mon espace',
      isActive: (path) =>
        path === `/p/${studioSlug}/espace` ||
        path === `/p/${studioSlug}/mes-credits`,
    },
    {
      href: `/p/${studioSlug}/espace/messages`,
      icon: MessageCircle,
      label: 'Messages',
      isActive: (path) => path.startsWith(`/p/${studioSlug}/espace/messages`),
      badge: unread,
    },
  ];

  return (
    <div className="bnav-wrap" aria-label="Navigation principale">
      <nav className="bnav-bar">
        {items.map(item => {
          const Icon = item.icon;
          const active = item.isActive(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`bnav-btn ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
            >
              <span className="bnav-icon">
                <Icon size={22} strokeWidth={active ? 1.7 : 1.4} />
                {item.badge > 0 && (
                  <span className="bnav-badge" aria-label={`${item.badge} non lus`}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span className="bnav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        /* Wrapper qui crée le fond dégradé "fade out" au-dessus du dock */
        .bnav-wrap {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          padding: 12px 16px calc(18px + env(safe-area-inset-bottom, 0));
          z-index: 40;
          background: linear-gradient(to top, #faf8f5 30%, transparent);
          pointer-events: none;
        }
        /* La pilule elle-même reprend les évents */
        .bnav-bar {
          pointer-events: auto;
          background: white;
          border-radius: 999px;
          height: 56px;
          display: flex;
          align-items: center;
          padding: 0 6px;
          box-shadow:
            0 8px 28px rgba(30, 20, 25, 0.10),
            0 2px 6px rgba(30, 20, 25, 0.04);
          border: 1px solid #f0ebe8;
        }
        .bnav-btn {
          flex: 1;
          height: 100%;
          background: none; border: none;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 1px;
          color: #888;
          cursor: pointer;
          padding: 6px 4px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.01em;
          text-decoration: none;
          transition: color .15s;
        }
        .bnav-btn:hover { color: #d4a0a0; }
        .bnav-btn.is-active {
          color: #1a1a2e;
          font-weight: 600;
        }
        .bnav-icon {
          position: relative;
          display: inline-flex; align-items: center; justify-content: center;
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
        .bnav-label {
          line-height: 1;
        }

        /* Hidden on desktop — header propose déjà tout */
        @media (min-width: 769px) {
          .bnav-wrap { display: none; }
        }
      `}</style>
    </div>
  );
}
