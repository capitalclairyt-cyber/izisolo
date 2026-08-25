'use client';

import { usePathname } from 'next/navigation';
import { can } from '@/lib/plan-guard';
import Sidebar from '@/components/navigation/Sidebar';
import AccountStatusBanner from '@/components/trial/AccountStatusBanner';
import { getVocabulaire } from '@/lib/vocabulaire';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import FeedbackWidget from '@/components/feedback/FeedbackWidget';

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

export default function DashboardLayoutClient({ children, profile, trial, nbCasATraiter = 0, nbEssais = 0 }) {
  const pathname = usePathname();

  const vocabulaire = getVocabulaire(
    profile?.metier || 'yoga',
    profile?.vocabulaire
  );

  return (
    <ToastProvider>
    <ConfirmProvider>
    <div className="dashboard-wrapper">
      {/* Palette d'identité visuelle imposée (Sauge & Cuivre), pas de
          personnalisation côté pro — cohérence brand pour tout le monde. */}

      <Sidebar
        studioNom={profile?.studio_nom || 'Mon Studio'}
        vocabulaire={vocabulaire}
        nbCasATraiter={nbCasATraiter}
        nbEssais={nbEssais}
        illustration={illustrationParMetier(profile?.metier)}
        peutEquipe={can(profile, 'equipe')}
      />

      <main className="dashboard-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          {/* Banner unifié — gère trial active/expired, past_due, canceled.
              Null si subscribed ou plan='free'. */}
          <AccountStatusBanner profile={profile} />
          {children}
        </div>
      </main>

      <FeedbackWidget />

    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}
