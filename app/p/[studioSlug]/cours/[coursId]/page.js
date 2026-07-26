import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import CoursReservationClient from './CoursReservationClient';
import { canSeeCours, resolveClientInfo } from '@/lib/visibilite';
import { studioCan } from '@/lib/plan-guard';
import { escapeIlike } from '@/lib/utils';
import { compterPlacesOccupees } from '@/lib/presences';

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
  let visible = canSeeCours(cours.visibilite, clientInfo);
  // Cours privé (v73) : la SEULE exception — l'élève déjà inscrit·e dessus
  // (invité·e par la prof) peut ouvrir la page depuis son espace.
  if (!visible && cours.visibilite === 'prive' && clientInfo) {
    const { count } = await supabase
      .from('presences')
      .select('id', { count: 'exact', head: true })
      .eq('cours_id', coursId)
      .eq('client_id', clientInfo.client_id);
    visible = (count || 0) > 0;
  }
  if (!visible) return null;

  // Formule v74 : sans elle, la page affichait « Cours complet » (formulaire
  // remplacé par la liste d'attente) pour des places que la route /reserver
  // aurait acceptées — l'élève s'inscrivait en file pour une place LIBRE et
  // n'était jamais promu (B1b, rouge).
  const { data: presencesCours } = await supabase
    .from('presences')
    .select('statut_pointage, annulation_tardive')
    .eq('cours_id', coursId);
  const nbInscrits = compterPlacesOccupees(presencesCours);

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
  const canCancel = studioCan(profile, 'reservation_en_ligne');
  const canReserve = studioCan(profile, 'reservation_en_ligne');
  const canWaitlist = studioCan(profile, 'liste_attente');

  return { profile, cours, nbInscrits: nbInscrits || 0, currentUser, alreadyRegistered, canCancel, canReserve, canWaitlist };
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
      canReserve={data.canReserve}
      canWaitlist={data.canWaitlist}
    />
  );
}
