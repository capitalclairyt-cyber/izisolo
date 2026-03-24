'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import Sidebar from '@/components/navigation/Sidebar';
import BackgroundDecor from '@/components/background/BackgroundDecor';
import { getVocabulaire } from '@/lib/vocabulaire';
import { ToastProvider } from '@/components/ui/ToastProvider';

// Mapping couleur → thème CSS
const THEME_MAP = {
  rose: 'rose',
  ocean: 'ocean',
  foret: 'foret',
  soleil: 'soleil',
  lavande: 'lavande',
  terre: 'terre',
};

export default function DashboardLayoutClient({ children, profile }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isAssistant = pathname === '/assistant';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Appliquer le thème de couleur
  useEffect(() => {
    if (profile?.ui_couleur) {
      const theme = THEME_MAP[profile.ui_couleur] || 'rose';
      if (theme !== 'rose') {
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }, [profile?.ui_couleur]);

  const vocabulaire = getVocabulaire(
    profile?.metier || 'yoga',
    profile?.vocabulaire
  );

  if (!mounted) return null;

  // Décor visuel (stocké dans le profil)
  const illustration = profile?.ui_illustration || 'lotus';
  const grilleActive = profile?.ui_grille_active !== false;
  const animationActive = profile?.ui_animation_active !== false;

  return (
    <ToastProvider>
    <div className="dashboard-wrapper">
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

      <main className="dashboard-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          {children}
        </div>
      </main>

      {/* Bouton flottant Assistant IA — toujours présent */}
      {!isAssistant && (
        <Link href="/assistant" className="ai-fab" aria-label="Assistant IA">
          <Sparkles size={20} />
          <span className="ai-fab-label">IA</span>
        </Link>
      )}

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
