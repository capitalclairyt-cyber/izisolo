'use client';

import { useEffect, useState } from 'react';
import BottomNav from '@/components/navigation/BottomNav';
import Sidebar from '@/components/navigation/Sidebar';
import { getVocabulaire } from '@/lib/vocabulaire';

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

  return (
    <div className="dashboard-wrapper">
      <Sidebar
        studioNom={profile?.studio_nom || 'Mon Studio'}
        vocabulaire={vocabulaire}
      />

      <main className="dashboard-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px' }}>
          {children}
        </div>
      </main>

      <BottomNav vocabulaire={vocabulaire} />
    </div>
  );
}
