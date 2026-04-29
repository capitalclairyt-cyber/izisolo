'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import Sidebar from '@/components/navigation/Sidebar';
import BackgroundDecor from '@/components/background/BackgroundDecor';
import { getVocabulaire } from '@/lib/vocabulaire';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { BottomDock, NewSheet, type DockTab } from '@/components/mobile';

interface Profile {
  id?: string;
  prenom?: string;
  studio_nom?: string;
  metier?: string;
  vocabulaire?: any;
  ui_couleur?: string;
  palette?: string;
  ui_illustration?: string;
  ui_grille_active?: boolean;
  ui_animation_active?: boolean;
}

const DOCK_ROUTES: Record<DockTab, string> = {
  home: '/dashboard',
  cal: '/agenda',
  users: '/clients',
  me: '/profil',
};

function pathToTab(pathname: string): DockTab | null {
  if (pathname === '/dashboard' || pathname === '/') return 'home';
  if (pathname.startsWith('/agenda') || pathname.startsWith('/cours')) return 'cal';
  if (pathname.startsWith('/clients')) return 'users';
  if (pathname.startsWith('/profil') || pathname.startsWith('/plus')
    || pathname.startsWith('/parametres')) return 'me';
  return null;
}

export default function DashboardShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Pages où on cache le shell (chat plein écran, pointage)
  const isAssistant = pathname === '/assistant';
  const hideShell = pathname.startsWith('/pointage/') || pathname === '/assistant';

  const vocabulaire = getVocabulaire(
    profile?.metier || 'yoga',
    profile?.vocabulaire
  );
  const illustration = profile?.ui_illustration || 'lotus';
  const grilleActive = profile?.ui_grille_active !== false;
  const animationActive = profile?.ui_animation_active !== false;

  if (!mounted) return null;

  const activeTab = pathToTab(pathname);

  const goTab = (tab: DockTab) => {
    router.push(DOCK_ROUTES[tab]);
  };

  const goNew = (kind: string) => {
    const routes: Record<string, string> = {
      cours:    '/cours/nouveau',
      eleve:    '/clients/nouveau',
      paiement: '/revenus/nouveau',
      atelier:  '/evenements',
      facture:  '/revenus',
      modele:   '/sondages/nouveau',
    };
    if (routes[kind]) router.push(routes[kind]);
  };

  return (
    <ToastProvider>
      <div className="ds-shell">
        <BackgroundDecor
          illustration={illustration}
          grilleActive={grilleActive}
          animationActive={animationActive}
        />

        <Sidebar
          studioNom={profile?.studio_nom || 'Mon Studio'}
          vocabulaire={vocabulaire}
          illustration={illustration}
        />

        <main className="ds-content">
          <div className="ds-content-inner">
            {children}
          </div>
        </main>

        {/* BottomDock (mobile only) — affichage natif du designer
            via le wrapper .ds-dock-host qui sert de parent positionné. */}
        {!hideShell && activeTab && (
          <div className="ds-dock-host">
            <BottomDock
              active={activeTab}
              onChange={goTab}
              onPlus={() => setNewSheetOpen(true)}
            />
          </div>
        )}

        <NewSheet
          open={newSheetOpen}
          onClose={() => setNewSheetOpen(false)}
          onPick={goNew as any}
        />

        {/* FAB Assistant IA — toujours visible (sauf sur /assistant) */}
        {!isAssistant && (
          <Link href="/assistant" className="ai-fab" aria-label="Assistant IA">
            <Sparkles size={20} />
            <span className="ai-fab-label">IA</span>
          </Link>
        )}
      </div>

      <style jsx global>{`
        .ds-shell {
          min-height: 100vh;
          background: var(--c-bg);
          color: var(--c-ink);
          font-family: var(--font-body);
        }
        .ds-content {
          padding-bottom: 100px;
          min-height: 100vh;
        }
        @media (min-width: 1024px) {
          .ds-content { padding-left: var(--sidebar-width, 230px); padding-bottom: 0; }
        }
        .ds-content-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 16px;
        }
        @media (min-width: 1024px) {
          .ds-content-inner { padding: 24px; }
        }

        /* Dock host : parent positionné où le BottomDock interne se pose
           en absolute bottom-0 (pattern designer). */
        .ds-dock-host {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          height: 96px;                       /* hauteur de la zone occupée par le dock + safe-area */
          padding-bottom: env(safe-area-inset-bottom, 0px);
          z-index: 50;
          pointer-events: none;
        }
        .ds-dock-host > * { pointer-events: auto; }
        @media (min-width: 1024px) {
          .ds-dock-host { display: none; }
        }

        /* FAB Assistant IA */
        .ai-fab {
          position: fixed;
          bottom: calc(96px + env(safe-area-inset-bottom, 0px));
          right: 16px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--c-accent);
          color: var(--c-accent-ink);
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 1px;
          box-shadow: var(--shadow-md);
          text-decoration: none;
          z-index: 49;
          transition: transform var(--t-fast);
        }
        .ai-fab:active { transform: scale(0.95); }
        .ai-fab-label { font-size: 0.5rem; font-weight: 700; }
        @media (min-width: 1024px) {
          .ai-fab { bottom: 24px; right: 24px; }
        }
      `}</style>
    </ToastProvider>
  );
}
