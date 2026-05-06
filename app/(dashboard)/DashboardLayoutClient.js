'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import AccountStatusBanner from '@/components/trial/AccountStatusBanner';
import { getVocabulaire } from '@/lib/vocabulaire';
import { ToastProvider } from '@/components/ui/ToastProvider';

// Petite touche d'identité : illustration sidebar choisie selon le métier
// du pro. Améliore le sentiment d'appartenance / personnalisation visuelle.
const ILLUSTRATIONS_PAR_METIER = {
  yoga: 'lotus',
  pilates: 'pilates',
  danse: 'danseuse',
  musique: 'clef-sol',
  coaching: 'meditation',
  arts: 'pinceau',
  meditation: 'buddha',
  autre: 'lotus',
};
function illustrationParMetier(metier) {
  return ILLUSTRATIONS_PAR_METIER[metier] || 'lotus';
}

export default function DashboardLayoutClient({ children, profile, trial, nbCasATraiter = 0 }) {
  const pathname = usePathname();

  const vocabulaire = getVocabulaire(
    profile?.metier || 'yoga',
    profile?.vocabulaire
  );

  return (
    <ToastProvider>
    <div className="dashboard-wrapper">
      {/* Palette d'identité visuelle imposée (Sauge & Cuivre), pas de
          personnalisation côté pro — cohérence brand pour tout le monde. */}

      <Sidebar
        studioNom={profile?.studio_nom || 'Mon Studio'}
        vocabulaire={vocabulaire}
        nbCasATraiter={nbCasATraiter}
        illustration={illustrationParMetier(profile?.metier)}
      />

      <main className="dashboard-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          {/* Banner unifié — gère trial active/expired, past_due, canceled.
              Null si subscribed ou plan='free'. */}
          <AccountStatusBanner profile={profile} />
          {children}
        </div>
      </main>

      {/* Bouton flottant Assistant IA — désactivé temporairement (UX pas au point).
          Pour réactiver, déscommenter le bloc ci-dessous. */}
      {/* {!isAssistant && (
        <Link href="/assistant" className="ai-fab" aria-label="Assistant IA">
          <Sparkles size={20} />
          <span className="ai-fab-label">IA</span>
        </Link>
      )} */}

      <style jsx global>{`
        .ai-fab {
          position: fixed;
          bottom: 96px;
          right: 20px;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--brand) 0%, var(--sage) 100%);
          color: white;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 40;
          text-decoration: none;
        }
        .ai-fab:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(0,0,0,0.2);
        }
        .ai-fab:active { transform: scale(0.95); }
        .ai-fab-label {
          font-size: 0.5625rem;
          font-weight: 800;
          letter-spacing: 0.03em;
          line-height: 1;
        }
        @media (min-width: 1024px) {
          .ai-fab {
            bottom: 100px;
            right: 32px;
          }
        }
      `}</style>

    </div>
    </ToastProvider>
  );
}
