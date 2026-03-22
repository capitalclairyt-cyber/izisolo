'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, CalendarDays, Users, Wallet, MoreHorizontal } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/cours', label: 'Cours', icon: CalendarDays },
  { href: '/clients', label: 'Élèves', icon: Users },
  { href: '/revenus', label: 'Revenus', icon: Wallet },
  { href: '/parametres', label: 'Plus', icon: MoreHorizontal },
];

export default function BottomNav({ vocabulaire = {} }) {
  const pathname = usePathname();

  // Adapter le label "Élèves" selon le vocabulaire
  const items = NAV_ITEMS.map(item => {
    if (item.href === '/clients' && vocabulaire.Clients) {
      return { ...item, label: vocabulaire.Clients };
    }
    return item;
  });

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}

      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--bottom-nav-height);
          background: var(--bg-nav);
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          z-index: 50;
          box-shadow: 0 -2px 8px rgba(92, 74, 58, 0.05);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.6875rem;
          font-weight: 500;
          transition: color var(--transition-fast);
          -webkit-tap-highlight-color: transparent;
        }

        .bottom-nav-item.active {
          color: var(--brand);
        }

        .bottom-nav-item:active {
          transform: scale(0.92);
        }

        @media (min-width: 1024px) {
          .bottom-nav {
            display: none;
          }
        }
      `}</style>
    </nav>
  );
}
