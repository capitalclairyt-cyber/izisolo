import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import CoursReservationClient from './CoursReservationClient';
import { canSeeCours, resolveClientInfo } from '@/lib/visibilite';
import { studioHasFeature } from '@/lib/plan-guard';
import { escapeIlike } from '@/lib/utils';

async function getData(studioSlug, coursId) {
  // Contenu PUBLIC du portail (studio, cours) + données élève filtrées par
  // client_id/email : on lit via admin (hors RLS), car les RLS bloquent un
  // élève connecté (authenticated ≠ prof) → sans ça, "Cours introuvable".
  // Aucun champ sensible (secrets Stripe) n'est sélectionné sur profiles.
  const supabase = supabaseAdmin;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, metier, ville, regles_annulation, afficher_inscrits, essai_actif, essai_paiement, essai_prix, plan, trial_started_at, created_at, stripe_subscription_status, stripe_current_period_end')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return null;

  const { data: cours } = await supabase
    .from('cours')
    .select('*')
    .eq('id', coursId)
    .eq('profile_id', profile.id)
    .single();
  if (!cours) return null;

  // Récupérer l'utilisateur connecté et son profil client dans ce studio.
  // getUser() nécessite le client SSR (porteur des cookies de session) ;
  // supabaseAdmin ne connaît pas la session.
  const ssrClient = await createServerClient();
  const { data: { user } } = await ssrClient.auth.getUser();

  // ── Vérification visibilité — si le cours n'est pas accessible au viewer, on
  // retourne null (déclenche notFound() côté page) ──
  const clientInfo = user ? await resolveClientInfo(supabase, profile.id, user.email) : null;
  if (!canSeeCours(cours.visibilite, clientInfo)) return null;

  const { count: nbInscrits } = await supabase
    .from('presences')
    .select('id', { count: 'exact', head: true })
    .eq('cours_id', coursId);

  let currentUser = null;
  let alreadyRegistered = false;
  if (user) {
    const { data: client } = await supabase
      .from('clients')
      .select('id, prenom, nom, email, telephone')
      .eq('profile_id', profile.id)
      .ilike('email', escapeIlike(user.email))
      .single();
    if (client) {
      currentUser = {
        nom: [client.prenom, client.nom].filter(Boolean).join(' '),
        email: client.email,
        tel: client.telephone || '',
      };
      // Détecter si déjà inscrit·e à ce cours pour bloquer le formulaire AVANT clic
      const { data: existing } = await supabase
        .from('presences')
        .select('id')
        .eq('cours_id', coursId)
        .eq('client_id', client.id)
        .maybeSingle();
      alreadyRegistered = !!existing;
    } else {
      currentUser = { nom: '', email: user.email, tel: '' };
    }
  }

  // Features dépendant du plan effectif du studio — pour ne PAS promettre à
  // l'élève ce que le studio ne peut pas offrir (annulation self-service /
  // liste d'attente = Pro). Évite les culs-de-sac et les promesses non tenues.
  const canCancel = studioHasFeature(profile, 'annulationParEleve');
  const canWaitlist = studioHasFeature(profile, 'listeAttente');

  return { profile, cours, nbInscrits: nbInscrits || 0, currentUser, alreadyRegistered, canCancel, canWaitlist };
}

export async function generateMetadata({ params }) {
  const { studioSlug, coursId } = await params;
  const data = await getData(studioSlug, coursId);
  if (!data) return { title: 'Cours introuvable' };
  return { title: `${data.cours.nom} — ${data.profile.studio_nom}` };
}

export default async function CoursDetailPortailPage({ params }) {
  const { studioSlug, coursId } = await params;
  const data = await getData(studioSlug, coursId);
  if (!data) notFound();

  return (
    <CoursReservationClient
      cours={data.cours}
      profile={data.profile}
      nbInscrits={data.nbInscrits}
      studioSlug={studioSlug}
      currentUser={data.currentUser}
      alreadyRegistered={data.alreadyRegistered}
      canCancel={data.canCancel}
      canWaitlist={data.canWaitlist}
    />
  );
}
