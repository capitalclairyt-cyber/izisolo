'use client';

import { useRouter } from 'next/navigation';
import {
  Screen, ScreenHeader, ScreenBody, HeaderIconBtn,
  Identity, ProfileGroup, ListRow,
} from '@/components/np';
import { createClient } from '@/lib/supabase';

interface Profile {
  id?: string;
  prenom?: string;
  nom?: string;
  studio_nom?: string;
  metier?: string;
  plan?: string;
  ville?: string;
}

export default function ProfilClient({ profile }: { profile: Profile | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const fullName = [profile?.prenom, profile?.nom].filter(Boolean).join(' ')
    || profile?.studio_nom || 'Mon studio';
  const initials = ((profile?.prenom?.[0] || '') + (profile?.nom?.[0] || '')) || 'M';
  const planLabel = profile?.plan && profile.plan !== 'free'
    ? `Plan ${profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}`
    : 'Plan Free';
  const meta = [planLabel, profile?.ville].filter(Boolean).join(' · ');

  return (
    <Screen>
      <ScreenHeader
        date="PROFIL"
        title=""
        actions={
          <HeaderIconBtn
            icon="settings" ariaLabel="Paramètres"
            onClick={() => router.push('/parametres')}
          />
        }
      />

      <ScreenBody>
        <Identity
          initials={initials}
          name={fullName}
          meta={meta}
          onEdit={() => router.push('/parametres')}
        />

        <ProfileGroup label="ACTIVITÉ">
          <ListRow icon="chart"    tone="rose"     title="Statistiques"     meta="Rétention, présence" onClick={() => router.push('/dashboard')} />
          <ListRow icon="euro"     tone="sage"     title="Revenus"          meta="Comptabilité et paiements"   onClick={() => router.push('/revenus')} />
          <ListRow icon="bookmark" tone="sand"     title="Ateliers & événements" meta="Stages, ateliers ponctuels" onClick={() => router.push('/evenements')} />
        </ProfileGroup>

        <ProfileGroup label="BUSINESS">
          <ListRow icon="tag"      tone="lavender" title="Offres"          meta="Carnets, abonnements"        onClick={() => router.push('/offres')} />
          <ListRow icon="cal"      tone="rose"     title="Abonnements actifs" meta="Suivi crédits & expirations" onClick={() => router.push('/abonnements')} />
          <ListRow icon="bell"     tone="sage"     title="Messagerie"       meta="Conversations + annonces"   onClick={() => router.push('/messagerie')} />
          <ListRow icon="sparkle"  tone="lavender" title="Sondages planning" meta="Tes meilleurs créneaux"     onClick={() => router.push('/sondages')} />
          <ListRow icon="music"    tone="sand"     title="Vidéos"           meta="Bibliothèque cours en ligne" onClick={() => router.push('/videos')} />
        </ProfileGroup>

        <ProfileGroup label="COMPTE">
          <ListRow icon="settings" tone="ink" title="Paramètres"     meta="Studio, profil, palette" onClick={() => router.push('/parametres')} />
          <ListRow icon="help"               title="Aide & support"                                onClick={() => router.push('/support')} />
          <ListRow icon="out"                title="Se déconnecter"  muted                          onClick={handleLogout} />
        </ProfileGroup>

        <div className="np-foot">IziSolo · v0.1 — fait à Lyon</div>
      </ScreenBody>
    </Screen>
  );
}
