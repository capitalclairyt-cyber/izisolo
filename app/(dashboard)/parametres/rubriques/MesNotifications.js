'use client';

// « Ce que je reçois » : push de cet appareil + choix par type (notif_prefs,
// sauvegarde immédiate au toggle par /api/profile).
import { Bell } from 'lucide-react';
import PushToggle from '@/components/push/PushToggle';
import NotifPrefsPanel from '@/components/push/NotifPrefsPanel';
import { useParametres } from '../ParametresContext';
import CarteReglage from '../CarteReglage';

export default function MesNotifications() {
  const { profile, setProfile } = useParametres();
  return (
    <CarteReglage id="notif_prefs" titre="Mes notifications" icone={Bell} resume="Cloche, push et emails, type par type" ouverte>
      <p className="section-desc">
        Active-les d&apos;abord sur cet appareil, puis choisis ce que tu veux recevoir.
      </p>
      <div style={{ marginBottom: 6 }}>
        <PushToggle />
      </div>
      <NotifPrefsPanel
        audience="prof"
        initialPrefs={profile?.notif_prefs || {}}
        onSave={async (next) => {
          const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notif_prefs: next }),
          });
          if (!res.ok) throw new Error('save failed');
          setProfile(prev => ({ ...prev, notif_prefs: next }));
        }}
      />
    </CarteReglage>
  );
}
