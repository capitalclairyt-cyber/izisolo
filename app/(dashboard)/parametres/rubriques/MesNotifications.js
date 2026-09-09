'use client';

// « Ce que je reçois » : push de cet appareil + choix par type (notif_prefs,
// sauvegarde immédiate au toggle par /api/profile). Découpe de page.js ; le
// seuil « paiement en attente » a rejoint la rubrique Seuils d'alerte.
import { Bell } from 'lucide-react';
import PushToggle from '@/components/push/PushToggle';
import NotifPrefsPanel from '@/components/push/NotifPrefsPanel';
import { useParametres } from '../ParametresContext';

export default function MesNotifications() {
  const { profile, setProfile } = useParametres();
  return (
    <div className="section izi-card">
      <div className="section-top">
        <div className="section-icon"><Bell size={20} /></div>
        <h2>Mes notifications</h2>
      </div>
      <p className="section-desc">
        Reçois une notification (et un email) quand il se passe quelque chose
        dans ton studio. Active-les d'abord sur cet appareil, puis choisis ce
        que tu veux recevoir.
      </p>
      <div style={{ marginBottom: 14 }}>
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
    </div>
  );
}
