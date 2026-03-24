'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home, CalendarDays, Users, Menu, X,
  Package, BarChart3, BookOpen, Mail, Sparkles,
  Settings, LogOut
} from 'lucide-react';
import { createClient } from '@/lib/supabase';

const QUICK_ITEMS = [
  { href: '/dashboard', label: 'Accueil', icon: Home },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/clients', label: 'Élèves', icon: Users },
];

const ALL_NAV = [
  {
    items: [
      { href: '/dashboard', label: 'Accueil', icon: Home },
      { href: '/agenda', label: 'Agenda', icon: CalendarDays },
      { href: '/clients', label: 'Élèves', icon: Users },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/offres', label: 'Offres', icon: Package },
      { href: '/revenus', label: 'Revenus', icon: BarChart3 },
      { href: '/abonnements', label: 'Abonnements', icon: BookOpen },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/mailing', label: 'Mailing', icon: Mail },
      { href: '/assistant', label: 'Assistant IA', icon: Sparkles },
    ],
  },
];

export default function BottomNav({ vocabulaire = {}, illustration = 'lotus', studioNom = 'Mon Studio' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  // Fermer au changement de page
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Bloquer le scroll quand le drawer est ouvert
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const quickItems = QUICK_ITEMS.map(item => {
    if (item.href === '/clients' && vocabulaire.Clients) {
      return { ...item, label: vocabulaire.Clients };
    }
    return item;
  });

  const sections = ALL_NAV.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (item.href === '/clients' && vocabulaire.Clients) {
        return { ...item, label: vocabulaire.Clients };
      }
      return item;
    }),
  }));

  const showIllustration = illustration && illustration !== 'aucun';

  return (
    <>
      {/* === DRAWER OVERLAY === */}
      <div
        className={`drawer-overlay ${drawerOpen ? 'visible' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* === DRAWER GLASS === */}
      <div ref={drawerRef} className={`drawer ${drawerOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-logo">
            <Sparkles size={18} />
            <span className="drawer-brand">IziSolo</span>
          </div>
          <div className="drawer-studio">{studioNom}</div>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="drawer-nav">
          {sections.map((section, idx) => (
            <div key={idx} className="drawer-section">
              {section.title && (
                <div className="drawer-section-title">{section.title}</div>
              )}
              {section.items.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`drawer-item ${isActive ? 'active' : ''}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Paramètres */}
          <div className="drawer-divider" />
          <Link
            href="/parametres"
            className={`drawer-item ${pathname === '/parametres' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
          >
            <Settings size={20} strokeWidth={pathname === '/parametres' ? 2.2 : 1.8} />
            <span>Paramètres</span>
          </Link>
        </nav>

        {/* Illustration */}
        {showIllustration && (
          <div className="drawer-illustration">
            <img src={`/illustrations/${illustration}.jpg`} alt="" draggable="false" />
          </div>
        )}

        {/* Déconnexion */}
        <div className="drawer-footer">
          <button className="drawer-item drawer-logout" onClick={handleLogout}>
            <LogOut size={20} strokeWidth={1.8} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* === BARRE DU BAS === */}
      <nav className="bottom-nav" aria-label="Navigation principale">
        {quickItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          className={`bottom-nav-item ${drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen(prev => !prev)}
        >
          {drawerOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          <span>Plus</span>
        </button>
      </nav>

      <style jsx global>{`
        /* === BOTTOM NAV BAR === */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--bottom-nav-height);
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          z-index: 52;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.04);
        }

        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 16px;
          min-width: 64px;
          min-height: 48px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.6875rem;
          font-weight: 500;
          transition: color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          background: none;
          border: none;
          cursor: pointer;
        }

        .bottom-nav-item.active {
          color: var(--brand-700);
        }

        .bottom-nav-item:active {
          transform: scale(0.92);
        }

        @media (min-width: 1024px) {
          .bottom-nav {
            display: none;
          }
        }

        /* === OVERLAY === */
        .drawer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.15);
          z-index: 50;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .drawer-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        @media (min-width: 1024px) {
          .drawer-overlay { display: none; }
        }

        /* === DRAWER === */
        .drawer {
          position: fixed;
          bottom: var(--bottom-nav-height);
          left: 0;
          right: 0;
          max-height: 80vh;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-top: 1px solid rgba(232, 224, 216, 0.6);
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.1);
          z-index: 51;
          display: flex;
          flex-direction: column;
          transform: translateY(100%);
          transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          overflow-y: auto;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        .drawer.open {
          transform: translateY(0);
        }

        @media (min-width: 1024px) {
          .drawer { display: none; }
        }

        /* === DRAWER HEADER === */
        .drawer-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px 12px;
          border-bottom: 1px solid rgba(232, 224, 216, 0.5);
          position: relative;
        }
        .drawer-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--brand);
        }
        .drawer-brand {
          font-size: 1.0625rem;
          font-weight: 700;
          color: var(--brand-dark);
        }
        .drawer-studio {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: 4px;
        }
        .drawer-close {
          position: absolute;
          right: 16px;
          top: 14px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.15s;
        }
        .drawer-close:hover {
          background: var(--cream);
          color: var(--text-primary);
        }

        /* === DRAWER NAV === */
        .drawer-nav {
          padding: 8px 12px;
          flex: 1;
        }

        .drawer-section {
          margin-bottom: 4px;
        }
        .drawer-section-title {
          padding: 10px 12px 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .drawer-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.9375rem;
          font-weight: 500;
          transition: all 0.15s ease;
          margin-bottom: 2px;
        }
        .drawer-item:hover {
          background: rgba(255, 255, 255, 0.7);
          color: var(--text-primary);
        }
        .drawer-item.active {
          background: var(--brand-light);
          color: var(--brand-700);
        }

        .drawer-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 14px;
          opacity: 0.4;
        }

        /* === ILLUSTRATION === */
        .drawer-illustration {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
        }
        .drawer-illustration img {
          width: 80px;
          height: 80px;
          object-fit: contain;
          opacity: 0.12;
          filter: grayscale(0.3);
        }

        /* === FOOTER === */
        .drawer-footer {
          padding: 4px 12px 12px;
          border-top: 1px solid rgba(232, 224, 216, 0.5);
        }
        .drawer-logout {
          border: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
          color: var(--text-muted);
        }
        .drawer-logout:hover {
          color: #c45050;
          background: rgba(196, 80, 80, 0.06);
        }
      `}</style>
    </>
  );
}
