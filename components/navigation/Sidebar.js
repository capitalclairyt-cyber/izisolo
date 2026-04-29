'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home, CalendarDays, Users, Settings,
  BookOpen, Mail, ChevronRight, Sparkles,
  Package, BarChart3, LogOut, Menu, X, GraduationCap, LifeBuoy, ClipboardList,
  MessageSquare
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import NotificationBell from '@/components/notifications/NotificationBell';
import MessagesBadge from '@/components/messagerie/MessagesBadge';

const NAV_SECTIONS = [
  {
    items: [
      { href: '/dashboard',  label: 'Accueil',           icon: Home },
      { href: '/agenda',     label: 'Agenda',             icon: CalendarDays },
      { href: '/cours',      label: 'Cours & Évènements', icon: GraduationCap },
      { href: '/clients',    label: 'Élèves',             icon: Users },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/offres',         label: 'Offres',         icon: Package },
      { href: '/revenus',        label: 'Revenus',        icon: BarChart3 },
      { href: '/abonnements',    label: 'Abonnements',    icon: BookOpen },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/messagerie',     label: 'Messagerie',      icon: MessageSquare, badge: true },
      { href: '/sondages',       label: 'Sondage planning', icon: ClipboardList },
    ],
  },
];

export default function Sidebar({ studioNom = 'Mon Studio', vocabulaire = {}, illustration = 'lotus' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [illuPulse, setIlluPulse] = useState(false);

  // Fermer au changement de page (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Bloquer le scroll quand mobile ouvert
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Déconnexion
  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Pulse animation sur l'illustration au clic
  const triggerPulse = () => {
    setIlluPulse(true);
    setTimeout(() => setIlluPulse(false), 600);
  };

  const sections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (item.href === '/clients' && vocabulaire.Clients) {
        return { ...item, label: vocabulaire.Clients };
      }
      return item;
    }),
  }));

  const showIllustration = illustration && illustration !== 'aucun';

  // Contenu de la sidebar (partagé desktop/mobile)
  const sidebarContent = (isMobile = false) => (
    <>
      {/* Header — Logo */}
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <div className="sidebar-logo-full">
            <Sparkles size={18} />
            <span className="sidebar-brand">IziSolo</span>
          </div>
          <div className="sidebar-header-right">
            <NotificationBell />
            {isMobile && (
              <button className="sidebar-close" onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        <div className="sidebar-studio">{studioNom}</div>
      </div>

      {/* Navigation + Paramètres */}
      <nav className="sidebar-nav">
        {sections.map((section, idx) => (
          <div key={idx} className="sidebar-section">
            {idx > 0 && <div className="sidebar-divider" />}
            {section.title && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            {section.items.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={triggerPulse}
                >
                  <span className="sidebar-icon-wrap" style={{ position: 'relative' }}>
                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                    {badge && <MessagesBadge />}
                  </span>
                  <span className="sidebar-label">{label}</span>
                  {isActive && <ChevronRight size={14} className="sidebar-chevron" />}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Support + Paramètres */}
        <div className="sidebar-divider" />
        <Link href="/support" className={`sidebar-item ${pathname === '/support' ? 'active' : ''}`} onClick={triggerPulse}>
          <span className="sidebar-icon-wrap">
            <LifeBuoy size={20} strokeWidth={pathname === '/support' ? 2.2 : 1.8} />
          </span>
          <span className="sidebar-label">Support</span>
          {pathname === '/support' && <ChevronRight size={14} className="sidebar-chevron" />}
        </Link>
        <Link href="/parametres" className={`sidebar-item ${pathname === '/parametres' ? 'active' : ''}`} onClick={triggerPulse}>
          <span className="sidebar-icon-wrap">
            <Settings size={20} strokeWidth={pathname === '/parametres' ? 2.2 : 1.8} />
          </span>
          <span className="sidebar-label">Paramètres</span>
          {pathname === '/parametres' && <ChevronRight size={14} className="sidebar-chevron" />}
        </Link>
      </nav>

      {/* Illustration */}
      {showIllustration && (
        <div className="sidebar-illustration">
          <img
            className={illuPulse ? 'pulse' : ''}
            src={`/illustrations/${illustration}.jpg`}
            alt=""
            draggable="false"
          />
        </div>
      )}

      {/* Footer — Déconnexion */}
      <div className="sidebar-footer">
        <button className="sidebar-item sidebar-logout" onClick={handleLogout}>
          <span className="sidebar-icon-wrap">
            <LogOut size={18} strokeWidth={1.8} />
          </span>
          <span className="sidebar-label">Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ====== DESKTOP : toujours déployée ====== */}
      <aside className="sidebar sidebar-desktop">
        {sidebarContent(false)}
      </aside>

      {/* ====== MOBILE : bouton hamburger + sidebar slide ====== */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay mobile */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar mobile */}
      <aside className={`sidebar sidebar-mobile ${mobileOpen ? 'open' : ''}`}>
        {sidebarContent(true)}
      </aside>

      <style jsx global>{`
        /* =========================================
           SIDEBAR — SHARED STYLES
           ========================================= */
        .sidebar {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-right: 1px solid rgba(232, 224, 216, 0.5);
          z-index: 50;
          overflow: hidden;
        }

        /* === HEADER === */
        .sidebar-header {
          padding: 14px 16px 10px;
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid rgba(232, 224, 216, 0.5);
          flex-shrink: 0;
        }
        .sidebar-header-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sidebar-header-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sidebar-logo-full {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--brand);
        }
        .sidebar-brand {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--brand-dark);
        }
        .sidebar-studio {
          margin-top: 4px;
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 190px;
        }
        .sidebar-close {
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          border-radius: 8px;
        }
        .sidebar-close:hover {
          background: rgba(0,0,0,0.05);
          color: var(--text-primary);
        }

        /* === NAV === */
        .sidebar-nav {
          padding: 12px 8px;
          overflow-y: auto;
          overflow-x: hidden;
          flex-shrink: 0;
        }
        .sidebar-section {
          margin-bottom: 2px;
        }
        .sidebar-section-title {
          padding: 12px 14px 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .sidebar-divider {
          height: 1px;
          background: var(--border);
          margin: 6px 12px;
          opacity: 0.4;
        }

        /* === NAV ITEMS === */
        .sidebar-item {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
          padding: 9px 14px;
          justify-content: flex-start;
          border-radius: 10px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
          position: relative;
          margin-bottom: 2px;
          cursor: pointer;
        }
        .sidebar-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          min-height: 20px;
          flex-shrink: 0;
        }
        .sidebar-label {
          flex: 1;
        }
        .sidebar-item:hover {
          background: rgba(255, 255, 255, 0.7);
          color: var(--text-primary);
        }
        .sidebar-item.active {
          background: var(--brand-light);
          color: var(--brand-700);
        }
        .sidebar-chevron {
          margin-left: auto;
          opacity: 0.4;
          flex-shrink: 0;
        }

        /* === ILLUSTRATION === */
        .sidebar-illustration {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          min-height: 60px;
          overflow: hidden;
        }
        .sidebar-illustration img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          opacity: 0.12;
          transition: opacity 0.3s ease, transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          filter: grayscale(0.2);
        }
        .sidebar-illustration img.pulse {
          animation: illuPulse 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes illuPulse {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.12) rotate(6deg); }
          60% { transform: scale(0.95) rotate(-3deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        /* === FOOTER === */
        .sidebar-footer {
          padding: 4px 8px 12px;
          border-top: 1px solid rgba(232, 224, 216, 0.5);
          flex-shrink: 0;
        }
        .sidebar-logout {
          border: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
          color: var(--text-muted);
          font-size: 0.8125rem;
        }
        .sidebar-logout:hover {
          color: #c45050;
          background: rgba(196, 80, 80, 0.06);
        }

        /* =========================================
           DESKTOP — toujours déployée
           ========================================= */
        .sidebar-desktop {
          position: fixed;
          top: 0;
          left: 0;
          width: 230px;
        }

        /* Cacher sur mobile */
        @media (max-width: 1023px) {
          .sidebar-desktop { display: none; }
        }

        /* =========================================
           MOBILE — slide-in depuis la gauche
           ========================================= */
        .sidebar-mobile {
          position: fixed;
          top: 0;
          left: 0;
          width: 260px;
          transform: translateX(-100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: none;
        }
        .sidebar-mobile.open {
          transform: translateX(0);
          box-shadow: 6px 0 32px rgba(0, 0, 0, 0.12);
        }

        /* Cacher sur desktop */
        @media (min-width: 1024px) {
          .sidebar-mobile { display: none; }
        }

        /* === BOUTON HAMBURGER (mobile uniquement) === */
        .mobile-menu-btn {
          display: none;
          position: fixed;
          top: 12px;
          left: 12px;
          z-index: 40;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          border: none;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          transition: background 0.15s;
        }
        .mobile-menu-btn:hover {
          background: rgba(255, 255, 255, 0.95);
        }
        @media (max-width: 1023px) {
          .mobile-menu-btn { display: flex; }
        }

        /* === OVERLAY MOBILE === */
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.15);
          z-index: 49;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .sidebar-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        /* Cacher overlay sur desktop */
        @media (min-width: 1024px) {
          .sidebar-overlay { display: none; }
        }
      `}</style>
    </>
  );
}
