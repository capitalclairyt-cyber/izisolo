'use client';

import Link from 'next/link';
import {
  Package, BarChart3, BookOpen, Calendar, Mail,
  Sparkles, Settings, LogOut, ChevronRight, User,
  CreditCard, Users2, ClipboardList, MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const MENU_SECTIONS = [
  {
    title: 'Gestion',
    items: [
      { href: '/offres', label: 'Offres', icon: Package, desc: 'Carnets, abonnements, cours à l\'unité' },
      { href: '/revenus', label: 'Revenus', icon: BarChart3, desc: 'Paiements et suivi financier' },
      { href: '/abonnements', label: 'Abonnements', icon: BookOpen, desc: 'Suivi des crédits et forfaits' },
      { href: '/evenements', label: 'Événements', icon: Calendar, desc: 'Stages, ateliers, événements' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { href: '/messagerie', label: 'Messagerie', icon: MessageSquare, desc: 'Messages privés et annonces groupées' },
      { href: '/sondages', label: 'Sondage planning', icon: ClipboardList, desc: 'Sonde tes élèves pour découvrir tes meilleurs créneaux' },
      // { href: '/assistant', label: 'Assistant IA', icon: Sparkles, desc: 'Aide intelligente' }, // désactivé
    ],
  },
  {
    title: 'Compte',
    items: [
      { href: '/parametres', label: 'Paramètres', icon: Settings, desc: 'Studio, profil, couleurs' },
    ],
  },
];

export default function PlusPage() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="plus-page">
      <div className="page-header animate-fade-in">
        <h1>Plus</h1>
      </div>

      {MENU_SECTIONS.map((section, idx) => (
        <div key={idx} className="menu-section animate-slide-up">
          <div className="section-title">{section.title}</div>
          <div className="menu-cards">
            {section.items.map(({ href, label, icon: Icon, desc }) => (
              <Link key={href} href={href} className="menu-card izi-card izi-card-interactive">
                <div className="menu-icon">
                  <Icon size={20} />
                </div>
                <div className="menu-info">
                  <span className="menu-label">{label}</span>
                  <span className="menu-desc">{desc}</span>
                </div>
                <ChevronRight size={18} className="menu-chevron" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Déconnexion */}
      <button onClick={handleLogout} className="logout-btn animate-slide-up">
        <LogOut size={18} />
        Se déconnecter
      </button>

      <style jsx global>{`
        .plus-page { display: flex; flex-direction: column; gap: 20px; padding-bottom: 40px; }
        .page-header h1 { font-size: 1.375rem; font-weight: 700; }

        .menu-section { display: flex; flex-direction: column; gap: 8px; }
        .section-title { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }

        .menu-cards { display: flex; flex-direction: column; gap: 6px; }
        .menu-card { display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-decoration: none; color: inherit; }
        .menu-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--brand-light); color: var(--brand-700); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .menu-info { flex: 1; min-width: 0; }
        .menu-label { font-weight: 600; font-size: 0.9375rem; display: block; }
        .menu-desc { font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 1px; }
        .menu-chevron { color: var(--text-muted); flex-shrink: 0; }

        .logout-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--bg-card); color: var(--danger); font-size: 0.9375rem; font-weight: 600; cursor: pointer; min-height: 48px; transition: all var(--transition-fast); }
        .logout-btn:active { background: #fef2f2; transform: scale(0.98); }
      `}</style>
    </div>
  );
}
