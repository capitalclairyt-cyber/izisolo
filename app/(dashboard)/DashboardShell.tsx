'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import BackgroundDecor from '@/components/background/BackgroundDecor';
import { getVocabulaire } from '@/lib/vocabulaire';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { BottomDock, NewSheet, type DockTab, type NewKind } from '@/components/np';

interface Profile {
  id?: string;
  prenom?: string;
  studio_nom?: string;
  metier?: string;
  vocabulaire?: any;
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

const NEW_ROUTES: Record<NewKind, string> = {
  cours:    '/cours/nouveau',
  eleve:    '/clients/nouveau',
  paiement: '/revenus/nouveau',
  atelier:  '/evenements',
  facture:  '/revenus',
  modele:   '/sondages/nouveau',
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

  // Pages plein écran qui cachent le shell (pas de dock, pas de sidebar)
  const hideShell = pathname.startsWith('/pointage/') || pathname === '/assistant';

  const vocabulaire = getVocabulaire(profile?.metier || 'yoga', profile?.vocabulaire);
  const illustration = profile?.ui_illustration || 'lotus';
  const grilleActive = profile?.ui_grille_active !== false;
  const animationActive = profile?.ui_animation_active !== false;

  if (!mounted) return null;

  const activeTab = pathToTab(pathname);

  const goTab = (tab: DockTab) => router.push(DOCK_ROUTES[tab]);
  const goNew = (kind: NewKind) => router.push(NEW_ROUTES[kind]);

  return (
    <ToastProvider>
      <div className="ds-shell">
        <BackgroundDecor
          illustration={illustration}
          grilleActive={grilleActive}
          animationActive={animationActive}
        />

        {/* Sidebar desktop ≥1024px */}
        {!hideShell && (
          <Sidebar
            studioNom={profile?.studio_nom || 'Mon Studio'}
            vocabulaire={vocabulaire}
            illustration={illustration}
          />
        )}

        {/* Container scrollable principal — flow normal de la page */}
        <main className="ds-main">
          <div className="ds-content">
            {children}
          </div>
        </main>

        {/* BottomDock mobile : position fixed bottom 0 → vraiment collé en bas
            quel que soit le contenu de la page. Cache desktop ≥1024px. */}
        {!hideShell && activeTab && (
          <div className="ds-dock-fixed">
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
          onPick={goNew}
        />
      </div>

      <style jsx global>{`
        .ds-shell {
          min-height: 100vh;
          background: var(--m-bg);
          color: var(--m-ink);
        }

        .ds-main { min-height: 100vh; }
        .ds-content {
          /* padding-bottom = hauteur dock (~80px) + safe-area pour pas être caché */
          padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
          max-width: 480px;
          margin: 0 auto;
          padding-left: 0; padding-right: 0;
        }

        @media (min-width: 1024px) {
          .ds-main { padding-left: var(--sidebar-width, 230px); }
          .ds-content {
            max-width: 1100px;
            padding-bottom: 24px;  /* pas de dock en desktop */
          }
        }

        /* Wrapper fixed du BottomDock : collé bottom 0 viewport */
        .ds-dock-fixed {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          z-index: 50;
          display: flex;
          justify-content: center;
          padding-bottom: env(safe-area-inset-bottom, 0px);
          pointer-events: none;
        }
        .ds-dock-fixed > .np-dock {
          /* Override le position absolute natif → relative dans notre wrapper fixed */
          position: relative !important;
          width: 100%;
          max-width: 480px;
          pointer-events: auto;
        }

        @media (min-width: 1024px) {
          .ds-dock-fixed { display: none; }
        }
      `}</style>
    </ToastProvider>
  );
}
