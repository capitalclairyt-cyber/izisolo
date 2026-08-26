import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PortailHome from './PortailHome';
import { resolveClientInfo, filterCoursVisibles } from '@/lib/visibilite';
import { ogPortail } from '@/lib/portail-metadata';
import { studioCan } from '@/lib/plan-guard';
import { presenceOccupePlace, compterPlacesOccupeesParCours } from '@/lib/presences';
import { coursDejaCommence } from '@/lib/dates';
import { reportError } from '@/lib/report';
import { getEssaiPrixParType } from '@/lib/essai-tarif';
import { chargerVignettesConfig, chargerPhotosCours, greffePhotos } from '@/lib/vignette-cours';
import { masquerLiensSiNonBranche } from '@/lib/paiement-en-ligne';

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  // Lecture publique du studio via admin : les RLS bloquent un élève connecté
  // (authenticated ≠ prof) → sans ça, "Studio introuvable" pour les élèves.
  // On ne sélectionne QUE des champs publics (jamais de secrets Stripe).
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('studio_nom, metier, ville')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return { title: 'Studio introuvable' };
  return {
    title: `${profile.studio_nom} — Réserver un cours`,
    ...ogPortail({
      studio: profile,
      titre: `${profile.studio_nom} — Réserver un cours`,
      description: `${profile.metier || 'Studio'} à ${profile.ville || 'France'}. Réserve tes cours en ligne.`,
    }),
  };
}

async function getStudioData(studioSlug) {
  // Contenu PUBLIC du portail (studio, cours, offres, sondages) via admin :
  // les RLS bloquent les utilisateur·ices authenticated (un élève connecté
  // n'est pas le prof). Tous les select sont publics, pas de secrets.
  const supabase = supabaseAdmin;
  // Heure de PARIS (le serveur Vercel est en UTC : entre minuit et 2 h l'été,
  // « aujourd'hui » était hier — B1b).
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, studio_nom, studio_slug, metier, adresse, code_postal, ville, types_cours,
      photo_url, photo_couverture, photo_couverture_focal_y,
      bio, philosophie, formations, annees_experience,
      horaires_studio, afficher_tarifs, afficher_horaires, afficher_inscrits, faq_publique,
      instagram_url, facebook_url, website_url,
      page_publique_draft,
      essai_actif, essai_paiement, essai_prix,
      plan, trial_started_at, stripe_subscription_status
    `)
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return null;

  // Si le pro a coché "Afficher mes tarifs", on charge aussi toutes les offres actives
  const offresAffichables = profile.afficher_tarifs
    ? supabase
        .from('offres')
        .select('id, nom, type, prix, seances, seances_par_semaine, duree_jours, stripe_payment_link')
        .eq('profile_id', profile.id)
        .eq('actif', true)
        .order('ordre')
    : Promise.resolve({ data: [] });

  // Sondage actif (le plus récent, non clos) — pour CTA visible sur le portail
  const sondageActifPromise = supabase
    .from('sondages_planning')
    .select('slug, titre, date_fin')
    .eq('profile_id', profile.id)
    .eq('actif', true)
    .or(`date_fin.is.null,date_fin.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [{ data: coursRaw }, { data: offresStripe }, { data: offresPubliques }, { data: sondageActif }] = await Promise.all([
    supabase
      .from('cours')
      .select('id, nom, date, heure, duree_minutes, type_cours, lieu, capacite_max, est_annule, recurrence_parent_id, visibilite, tarif_unitaire, carnets_acceptes, format')
      .eq('profile_id', profile.id)
      .eq('est_annule', false)
      .gte('date', today)
      .lte('date', in60)
      .order('date', { ascending: true })
      .order('heure', { ascending: true })
      // 240 (≈4 séances/jour sur 60 j) : la limite 60 coupait les semaines
      // LOINTAINES en silence dès ~10 séances/semaine (B1b).
      .limit(240),
    supabase
      .from('offres')
      .select('id, nom, type, prix, seances, seances_par_semaine, duree_jours, stripe_payment_link')
      .eq('profile_id', profile.id)
      .eq('actif', true)
      .not('stripe_payment_link', 'is', null)
      .order('ordre'),
    offresAffichables,
    sondageActifPromise,
  ]);

  // ── Filtrage par visibilité (selon l'auth context du visiteur) ──
  // Le visiteur peut être : pas authentifié / authentifié mais pas client /
  // client (avec statut + abos actifs). getUser() nécessite le client SSR
  // (porteur des cookies de session) ; supabaseAdmin ne connaît pas la session.
  const ssrClient = await createServerClient();
  const { data: { user } } = await ssrClient.auth.getUser();
  const clientInfo = user ? await resolveClientInfo(supabase, profile.id, user) : null; // v83 : FK d'abord
  const cours = filterCoursVisibles(coursRaw || [], clientInfo);

  // ── Réservation 1 clic : si le visiteur est un client reconnu de ce studio,
  // on charge son identité (nom/email pour l'appel /reserver) + la liste des
  // cours déjà réservés (pour afficher « Inscrit·e » au lieu du bouton).
  let currentClient = null;
  let reservedCoursIds = [];
  if (clientInfo?.client_id) {
    const [{ data: cli }, { data: pres }] = await Promise.all([
      supabase.from('clients').select('prenom, nom, email').eq('id', clientInfo.client_id).single(),
      supabase.from('presences').select('cours_id, statut_pointage, annulation_tardive').eq('client_id', clientInfo.client_id).eq('profile_id', profile.id),
    ]);
    if (cli) currentClient = { nom: [cli.prenom, cli.nom].filter(Boolean).join(' ') || cli.email, email: cli.email };
    // Une résa annulée (tardive ou résolue annule/declinee) ne doit plus
    // afficher « ✓ Inscrit·e » sur la carte du cours (B1b).
    reservedCoursIds = (pres || []).filter(presenceOccupePlace).map(p => p.cours_id);
  }

  // Places occupées par cours — RPC d'agrégat v89 (formule v74 en SQL).
  // Avant : .in(240 ids) sur les LIGNES presences → cap PostgREST 1000
  // silencieux → jauges fausses dès un studio bien rempli (AUDIT-PERF cat 1.1).
  const coursIds = (cours || []).map(c => c.id);
  let presencesCounts = {};
  if (coursIds.length > 0) {
    try {
      presencesCounts = await compterPlacesOccupeesParCours(supabase, coursIds);
    } catch (presErr) {
      // Jauges à 0 plutôt que page morte — la RPC reserver_place re-vérifie
      // la capacité sous verrou à la réservation de toute façon.
      reportError('[portail] comptage places err:', presErr, { route: `/p/${studioSlug}` });
    }
  }

  // Filtrer les cours du jour dont l'heure est déjà passée — horloge unique
  // Paris (lib/dates), le calcul local serveur UTC gardait ~2 h de trop.
  const coursFutur = (cours || []).filter(c => !coursDejaCommence(c));

  // v99 — l'identité visuelle du planning : le ton et la vignette de chaque
  // TYPE de cours (config du studio) plus la photo propre à certaines séances.
  // Les 3 colonnes se chargent À PART (elles ne vont jamais dans un select
  // principal, anti-pattern §12), puis les photos sont greffées sur les cours
  // pour que l'affichage n'ait qu'un seul objet à lire.
  const [apparence, photosSeances] = await Promise.all([
    chargerVignettesConfig(supabase, profile.id),
    chargerPhotosCours(supabase, coursFutur.map(c => c.id)),
  ]);

  // Le paiement en ligne n'est branché que si le webhook Stripe est déclaré.
  // Sans lui, la visiteuse paierait sur un vrai lien dont IziSolo n'apprendrait
  // jamais rien (retour Manon 2026-08-26) : on retire les liens, la grille
  // bascule sur « Demander cette offre » (v97).
  // ⚠️ Lecture SÉPARÉE : `profile` part au navigateur, le secret n'y entre pas.
  const { data: confStripe } = await supabase
    .from('profiles')
    .select('stripe_webhook_secret')
    .eq('id', profile.id)
    .maybeSingle();

  return {
    profile,
    cours: greffePhotos(coursFutur.map(c => ({
      ...c,
      nbInscrits: presencesCounts[c.id] || 0,
    })), photosSeances),
    tonsParType: apparence.tons,
    vignettesParType: apparence.vignettes,
    offresStripe: masquerLiensSiNonBranche(offresStripe, confStripe).filter(o => o.stripe_payment_link),
    offresPubliques: masquerLiensSiNonBranche(offresPubliques, confStripe),
    sondageActif: sondageActif || null,
    currentClient,
    reservedCoursIds,
    // Tarif d'essai par type (v92, lecture défensive — null pré-migration) :
    // le CTA essai de la home affiche « dès X € » quand le tarif varie.
    surchargesEssai: await getEssaiPrixParType(supabase, profile.id),
  };
}

export default async function PortailPage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = await searchParams;
  const data = await getStudioData(studioSlug);
  if (!data) notFound();

  // Mode preview : si ?preview=1 ET le visiteur est le pro propriétaire du studio,
  // on applique le brouillon (page_publique_draft) sur les champs publics pour
  // simuler ce que verrait un visiteur après publication.
  let profile = data.profile;
  let isPreview = false;
  let isDemo = false;
  if (sp?.preview === '1') {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === profile.id && profile.page_publique_draft) {
      profile = { ...profile, ...profile.page_publique_draft };
      isPreview = true;
    }
  }

  // Mode démo : si ?demo=1 ET le visiteur est le pro du studio, on affiche
  // un bandeau "Mode démo" pour signaler que l'on visite son propre portail
  // avec un compte fictif. Permet de voir toute l'expérience UX (hero + cours
  // + tarifs) avant d'aller dans l'espace démo.
  if (sp?.demo === '1') {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === profile.id) {
      isDemo = true;
    }
  }

  // ?tab=tarifs : le bloc « Mes offres » intégré sur le site de la prof renvoie
  // ici. Sans ça, la visiteuse atterrissait sur le planning et devait retrouver
  // l'onglet des tarifs toute seule.
  return (
    <PortailHome
      profile={profile}
      cours={data.cours}
      offresStripe={data.offresStripe}
      offresPubliques={data.offresPubliques}
      sondageActif={data.sondageActif}
      studioSlug={studioSlug}
      isPreview={isPreview}
      isDemo={isDemo}
      currentClient={data.currentClient}
      reservedCoursIds={data.reservedCoursIds}
      surchargesEssai={data.surchargesEssai}
      tonsParType={data.tonsParType}
      vignettesParType={data.vignettesParType}
      tabInitial={typeof sp?.tab === 'string' ? sp.tab : null}
      canReserve={studioCan(profile, 'reservation_en_ligne')}
      essaiVisible={studioCan(profile, 'cours_essai')}
    />
  );
}
