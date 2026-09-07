import { createServerClient } from '@/lib/supabase-server';
import { studioCan } from '@/lib/plan-guard';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import SondageReponseClient from './SondageReponseClient';
import { resoudreFicheEleve } from '@/lib/fiche-eleve';

export async function generateMetadata({ params }) {
  const { studioSlug, sondageSlug } = await params;
  // Lecture publique du sondage via admin : les RLS bloquent un élève connecté
  // (authenticated ≠ prof). Select restreint à des champs publics.
  const supabase = supabaseAdmin;
  const { data: sondage } = await supabase
    .from('sondages_planning')
    .select('titre, profiles!inner(studio_nom, studio_slug)')
    .eq('slug', sondageSlug)
    .eq('profiles.studio_slug', studioSlug)
    .maybeSingle();
  if (!sondage) return { title: 'Sondage introuvable' };
  return {
    title: `${sondage.titre} · ${sondage.profiles.studio_nom}`,
    description: `Aide ${sondage.profiles.studio_nom} à construire son planning idéal.`,
    robots: { index: false, follow: false },
  };
}

export default async function SondagePublicPage({ params }) {
  const { studioSlug, sondageSlug } = await params;
  // Contenu PUBLIC (studio, sondage, créneaux) via admin : les RLS bloquent un
  // élève connecté (authenticated ≠ prof) → sans ça, notFound() pour l'élève.
  // Le select sur profiles ne liste que des champs publics (pas de secrets).
  const supabase = supabaseAdmin;

  // Le studio
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, photo_url, plan, trial_started_at, stripe_subscription_status')
    .eq('studio_slug', studioSlug)
    .maybeSingle();
  if (!profile) notFound();

  // Frontière des plans (2026-09-07) : le sondage planning est Complet.
  if (!studioCan(profile, 'sondages')) {
    return (
      <div data-testid="sondage-indisponible" style={{ maxWidth: 520, margin: '48px auto', padding: '32px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px solid #f0ebe8' }}>
        <h1 style={{ fontSize: '1.25rem', margin: '0 0 10px' }}>Ce sondage n&apos;est pas ouvert</h1>
        <p style={{ color: '#6b6560', lineHeight: 1.55 }}>{profile.studio_nom} n&apos;a pas activé les sondages en ligne pour le moment. Parle-lui directement de tes créneaux préférés.</p>
      </div>
    );
  }

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

  // Si élève connecté du studio : auto-pré-rempli côté client (via API qui regarde le user).
  // getUser() nécessite le client SSR (cookies de session) ; l'admin n'a pas de session.
  const ssrClient = await createServerClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  let connectedClient = null;
  if (user) {
    const client = await resoudreFicheEleve(supabase, profile.id, user, 'id, prenom, email'); // v83
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
