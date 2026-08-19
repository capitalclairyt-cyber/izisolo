import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import CoursReservationClient from './CoursReservationClient';
import { canSeeCours, resolveClientInfo } from '@/lib/visibilite';
import { studioCan } from '@/lib/plan-guard';
import { resoudreFicheEleve } from '@/lib/fiche-eleve';
import { compterPlacesOccupees } from '@/lib/presences';
import { resoudreCarnetApplicable } from '@/lib/carnet-resolution';
import { ogPortail } from '@/lib/portail-metadata';

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
  const clientInfo = user ? await resolveClientInfo(supabase, profile.id, user) : null; // v83 : FK d'abord
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
  let prevision = null;
  if (user) {
    // v83 : FK douce d'abord (survit à un changement d'email de la fiche).
    const client = await resoudreFicheEleve(supabase, profile.id, user, 'id, prenom, nom, email, telephone');
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

      // ── Prévision paiement (B2f, R2) : dire la VÉRITÉ avant de réserver —
      // même calcul que le pointage (resoudreCarnetApplicable v64/v70/v82).
      // Avant : « décomptée de ton carnet si tu en utilises un » (aveugle).
      const { data: abosActifs } = await supabase
        .from('abonnements')
        .select('id, statut, seances_total, seances_utilisees, date_fin, date_pause_debut, date_pause_fin, types_cours_autorises, offre_nom')
        .eq('client_id', client.id)
        .eq('profile_id', profile.id)
        .eq('statut', 'actif');
      const carnetPrevu = resoudreCarnetApplicable(abosActifs || [], cours);
      const tarif = Number(cours.tarif_unitaire) > 0 ? Number(cours.tarif_unitaire) : null;
      if (carnetPrevu) {
        prevision = {
          kind: 'carnet',
          // offre_nom = le snapshot dénormalisé posé à la vente — LA source
          // (la jointure offres(nom) rendait « ton carnet » générique pour
          // tout abo sans offre_id, attrapé par le walkthrough B2f).
          nom: carnetPrevu.offre_nom || 'ton carnet',
          // reste APRÈS cette séance (null = illimité)
          resteApres: carnetPrevu.seances_total != null
            ? Math.max(0, carnetPrevu.seances_total - (carnetPrevu.seances_utilisees || 0) - 1)
            : null,
        };
      } else if (tarif) {
        prevision = {
          kind: 'unite',
          montant: tarif,
          // Mixte : elle A un carnet mais il ne couvre pas ce type → le dire.
          carnetInapplicable: cours.carnets_acceptes === true && (abosActifs || []).length > 0,
        };
      } else if ((abosActifs || []).length > 0) {
        prevision = { kind: 'incompatible' };
      } else {
        prevision = { kind: 'sans_carnet' };
      }
    } else {
      // Sans fiche dans CE studio : préremplir avec le prénom d'inscription
      // (metadata) — le champ vide à retaper était le terrain des prénoms
      // tronqués (enquête 2026-07-28 « K pour Karen »).
      currentUser = { nom: user.user_metadata?.prenom || '', email: user.email, tel: '' };
    }
  }

  // Features dépendant du plan effectif du studio — pour ne PAS promettre à
  // l'élève ce que le studio ne peut pas offrir (annulation self-service /
  // liste d'attente = Pro). Évite les culs-de-sac et les promesses non tenues.
  const canCancel = studioCan(profile, 'reservation_en_ligne');
  const canReserve = studioCan(profile, 'reservation_en_ligne');
  const canWaitlist = studioCan(profile, 'liste_attente');

  // Cours en ligne (v86) : le lien de visio ne sort JAMAIS par cette page
  // publique (select('*') l'embarquerait dans les props de n'importe quel
  // visiteur). Il ne se sert que dans l'espace élève / rappel J-1, sous verrou.
  delete cours.lien_visio;
  delete cours.lien_visio_verrouille;
  return { profile, cours, nbInscrits: nbInscrits || 0, currentUser, alreadyRegistered, prevision, canCancel, canReserve, canWaitlist };
}

export async function generateMetadata({ params }) {
  const { studioSlug, coursId } = await params;
  const data = await getData(studioSlug, coursId);
  if (!data) return { title: 'Cours introuvable' };
  const { cours, profile } = data;
  // Lien de séance partagé tel quel par la prof (« le yoga de pleine lune de
  // mercredi ») : l'aperçu doit dire la séance + le studio, pas IziSolo.
  let quand = '';
  try {
    const jour = new Date(`${cours.date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    quand = ` ${jour}${cours.heure ? ` à ${String(cours.heure).slice(0, 5)}` : ''}`;
  } catch { /* date imparsable → description sans la date, jamais de crash */ }
  const titre = `${cours.nom} — ${profile.studio_nom}`;
  return {
    title: titre,
    ...ogPortail({
      studio: profile,
      titre,
      description: `Réserve ta place${quand} chez ${profile.studio_nom}.`,
    }),
  };
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
      prevision={data.prevision}
      canCancel={data.canCancel}
      canReserve={data.canReserve}
      canWaitlist={data.canWaitlist}
    />
  );
}
