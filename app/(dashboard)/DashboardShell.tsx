'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
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

  const isAssistant = pathname === '/assistant';
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
        <Sidebar
          studioNom={profile?.studio_nom || 'Mon Studio'}
          vocabulaire={vocabulaire}
          illustration={illustration}
        />

        {/* Container scrollable. Sur mobile, .np-app gère le layout interne
            (header sticky + body scrollable + dock fixe). */}
        <main className="ds-main">
          <div className="ds-mobile">
            {children}
            {!hideShell && activeTab && (
              <BottomDock
                active={activeTab}
                onChange={goTab}
                onPlus={() => setNewSheetOpen(true)}
              />
            )}
            <NewSheet
              open={newSheetOpen}
              onClose={() => setNewSheetOpen(false)}
              onPick={goNew}
            />
          </div>
        </main>

        {/* FAB Assistant IA */}
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
          background: var(--m-bg);
          color: var(--m-ink);
        }

        /* Wrapper mobile : structure layout correct pour .np-app + .np-dock */
        .ds-mobile {
          position: relative;
          min-height: 100vh;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
          background: var(--m-bg);
        }

        @media (min-width: 1024px) {
          .ds-main { padding-left: var(--sidebar-width, 230px); }
          .ds-mobile { max-width: 1100px; }
          /* Sur desktop, on cache le BottomDock (sidebar à la place) */
          .ds-mobile .np-dock { display: none; }
          /* Et on rend le scroll natif au body, pas dans .np-body */
          .ds-mobile .np-app { padding-top: 0; }
          .ds-mobile .np-body { overflow: visible; padding-bottom: 24px; }
        }

        /* FAB Assistant IA */
        .ai-fab {
          position: fixed;
          bottom: calc(96px + env(safe-area-inset-bottom, 0px));
          right: 16px;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--m-accent);
          color: white;
          display: flex; align-items: center; justify-content: center;
          flex-direction: column; gap: 1px;
          box-shadow: var(--m-shadow-fab);
          text-decoration: none;
          z-index: 49;
          transition: transform 150ms;
        }
        .ai-fab:active { transform: scale(0.95); }
        .ai-fab-label { font-size: 8.5px; font-weight: 700; letter-spacing: 0.04em; }
        @media (min-width: 1024px) {
          .ai-fab { bottom: 24px; right: 24px; }
        }
      `}</style>
    </ToastProvider>
  );
}
