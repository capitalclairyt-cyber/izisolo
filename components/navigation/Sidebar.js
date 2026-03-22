'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home, CalendarDays, Users, Wallet, Settings,
  BookOpen, Calendar, Mail, MessageCircle, LayoutGrid,
  ChevronRight, Sparkles
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    items: [
      { href: '/dashboard', label: 'Accueil', icon: Home },
      { href: '/cours', label: 'Cours', icon: CalendarDays },
      { href: '/clients', label: 'Élèves', icon: Users },
    ],
  },
  {
    title: 'Gestion',
    items: [
      { href: '/revenus', label: 'Revenus', icon: Wallet },
      { href: '/abonnements', label: 'Abonnements', icon: BookOpen },
      { href: '/agenda', label: 'Agenda', icon: Calendar },
      { href: '/evenements', label: 'Événements', icon: LayoutGrid },
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

export default function Sidebar({ studioNom = 'Mon Studio', vocabulaire = {} }) {
  const pathname = usePathname();

  // Adapter les labels selon le vocabulaire
  const sections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item => {
      if (item.href === '/clients' && vocabulaire.Clients) {
        return { ...item, label: vocabulaire.Clients };
      }
      return item;
    }),
  }));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Sparkles size={20} />
          <span className="sidebar-brand">IziSolo</span>
        </div>
        <div className="sidebar-studio">{studioNom}</div>
      </div>

      <nav className="sidebar-nav">
        {sections.map((section, idx) => (
          <div key={idx} className="sidebar-section">
            {section.title && (
              <div className="sidebar-section-title">{section.title}</div>
            )}
            {section.items.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                  {isActive && <ChevronRight size={14} className="sidebar-chevron" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Link href="/parametres" className="sidebar-item">
          <Settings size={18} />
          <span>Paramètres</span>
        </Link>
      </div>

      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: var(--bg-nav);
          border-right: 1px solid var(--border);
          display: none;
          flex-direction: column;
          z-index: 50;
          overflow-y: auto;
        }

        @media (min-width: 1024px) {
          .sidebar {
            display: flex;
          }
        }

        .sidebar-header {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-logo {
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
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .sidebar-nav {
          flex: 1;
          padding: 12px 8px;
        }

        .sidebar-section {
          margin-bottom: 8px;
        }

        .sidebar-section-title {
          padding: 8px 12px 4px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }

        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .sidebar-item:hover {
          background: var(--cream-dark);
          color: var(--text-primary);
        }

        .sidebar-item.active {
          background: var(--brand-light);
          color: var(--brand-700);
        }

        .sidebar-chevron {
          margin-left: auto;
          opacity: 0.5;
        }

        .sidebar-footer {
          padding: 8px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </aside>
  );
}
