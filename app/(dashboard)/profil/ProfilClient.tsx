'use client';

import { useRouter } from 'next/navigation';
import { Identity, ProfileGroup, ListRow, ScreenHeader } from '@/components/mobile';
import { createClient } from '@/lib/supabase';

interface Profile {
  id?: string;
  prenom?: string;
  nom?: string;
  studio_nom?: string;
  metier?: string;
  plan?: string;
}

export default function ProfilClient({ profile }: { profile: Profile | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const fullName = [profile?.prenom, profile?.nom].filter(Boolean).join(' ') || profile?.studio_nom || 'Mon studio';
  const meta = [profile?.metier, profile?.plan && profile.plan !== 'free' ? profile.plan : null]
    .filter(Boolean).join(' · ') || 'Plan Free';

  return (
    <div className="profil-page">
      <ScreenHeader title="Profil" />

      <Identity
        name={fullName}
        meta={meta}
        onEdit={() => router.push('/parametres')}
      />

      <ProfileGroup label="ACTIVITÉ">
        <ListRow
          icon="chart"
          title="Statistiques"
          meta="Présence, taux de remplissage"
          iconTone="rose"
          onClick={() => router.push('/dashboard')}
        />
        <ListRow
          icon="euro"
          title="Revenus"
          meta="Comptabilité et paiements"
          iconTone="sand"
          onClick={() => router.push('/revenus')}
        />
        <ListRow
          icon="bookmark"
          title="Événements"
          meta="Stages, ateliers ponctuels"
          iconTone="lavender"
          onClick={() => router.push('/evenements')}
        />
      </ProfileGroup>

      <ProfileGroup label="BUSINESS">
        <ListRow
          icon="bag"
          title="Offres"
          meta="Carnets, abonnements"
          iconTone="rose"
          onClick={() => router.push('/offres')}
        />
        <ListRow
          icon="cal"
          title="Abonnements actifs"
          meta="Suivi crédits & expirations"
          iconTone="sage"
          onClick={() => router.push('/abonnements')}
        />
        <ListRow
          icon="bell"
          title="Messagerie"
          meta="Conversations + annonces"
          iconTone="rose"
          onClick={() => router.push('/messagerie')}
        />
        <ListRow
          icon="sparkle"
          title="Sondages planning"
          meta="Découvre tes meilleurs créneaux"
          iconTone="lavender"
          onClick={() => router.push('/sondages')}
        />
        <ListRow
          icon="film"
          title="Vidéos"
          meta="Bibliothèque cours en ligne"
          iconTone="sand"
          onClick={() => router.push('/videos')}
        />
      </ProfileGroup>

      <ProfileGroup label="COMPTE">
        <ListRow
          icon="settings"
          title="Paramètres"
          meta="Studio, profil, palette"
          iconTone="ink"
          onClick={() => router.push('/parametres')}
        />
        <ListRow
          icon="help"
          title="Support"
          meta="Aide et contact"
          iconTone="mute"
          onClick={() => router.push('/support')}
        />
        <ListRow
          icon="logout"
          title="Se déconnecter"
          iconTone="mute"
          muted
          hideChevron
          onClick={handleLogout}
        />
      </ProfileGroup>

      <style jsx>{`
        .profil-page {
          padding-bottom: 40px;
        }
      `}</style>
    </div>
  );
}
