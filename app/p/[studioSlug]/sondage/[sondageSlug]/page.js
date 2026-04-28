import { createServerClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import SondageReponseClient from './SondageReponseClient';

export async function generateMetadata({ params }) {
  const { studioSlug, sondageSlug } = await params;
  const supabase = await createServerClient();
  const { data: sondage } = await supabase
    .from('sondages_planning')
    .select('titre, profiles!inner(studio_nom, studio_slug)')
    .eq('slug', sondageSlug)
    .eq('profiles.studio_slug', studioSlug)
    .maybeSingle();
  if (!sondage) return { title: 'Sondage introuvable' };
  return {
    title: `${sondage.titre} — ${sondage.profiles.studio_nom}`,
    description: `Aide ${sondage.profiles.studio_nom} à construire son planning idéal.`,
    robots: { index: false, follow: false },
  };
}

export default async function SondagePublicPage({ params }) {
  const { studioSlug, sondageSlug } = await params;
  const supabase = await createServerClient();

  // Le studio
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, photo_url')
    .eq('studio_slug', studioSlug)
    .maybeSingle();
  if (!profile) notFound();

  // Le sondage + créneaux
  const { data: sondage } = await supabase
    .from('sondages_planning')
    .select('id, slug, titre, message, date_fin, visibilite, actif')
    .eq('slug', sondageSlug)
    .eq('profile_id', profile.id)
    .maybeSingle();
  if (!sondage) notFound();

  const today = new Date().toISOString().slice(0, 10);
  const isClosed = !sondage.actif || (sondage.date_fin && sondage.date_fin < today);

  const { data: creneaux } = await supabase
    .from('sondages_creneaux')
    .select('id, type_cours, jour_semaine, heure, duree_minutes, ordre')
    .eq('sondage_id', sondage.id)
    .order('ordre');

  // Si élève connecté du studio : auto-pré-rempli côté client (via API qui regarde le user)
  const { data: { user } } = await supabase.auth.getUser();
  let connectedClient = null;
  if (user) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, prenom, email')
      .eq('profile_id', profile.id)
      .ilike('email', user.email)
      .maybeSingle();
    connectedClient = client || null;
  }

  return (
    <SondageReponseClient
      profile={profile}
      sondage={sondage}
      creneaux={creneaux || []}
      isClosed={isClosed}
      connectedClient={connectedClient}
      isLoggedIn={!!user}
    />
  );
}
