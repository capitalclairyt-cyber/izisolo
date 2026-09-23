import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notFound } from 'next/navigation';
import PortailHome from './PortailHome';
import { resolveClientInfo } from '@/lib/visibilite';
import { ogPortail } from '@/lib/portail-metadata';
import { studioCan } from '@/lib/plan-guard';
import { presenceOccupePlace } from '@/lib/presences';
import { getEssaiPrixParType } from '@/lib/essai-tarif';
import { chargerVignettesConfig } from '@/lib/vignette-cours';
import { chargerIntervenantes, equipePourPortail } from '@/lib/intervenante';
import { chargerSeancesPortail, lireSeancesBrutes } from '@/lib/portail-seances-service';
import { finFenetre } from '@/lib/portail-fenetre';
import { structuresCitees, pageDeLIntervenante } from '@/lib/ponts';
import { masquerLiensSiNonBranche } from '@/lib/paiement-en-ligne';
import { urlPortail } from '@/lib/studio-host';
import { after } from 'next/server';
import { headers } from 'next/headers';
import { compterVue } from '@/lib/vues-portail-service';
import { traducteurPortail, memoriserLangueVisite } from '@/lib/i18n-portail-serveur';

export async function generateMetadata({ params }) {
  const { studioSlug } = await params;
  // Le titre et la description parlent la langue de la visiteuse (2026-09-22).
  const t = await traducteurPortail(studioSlug);
  // Lecture publique du studio via admin : les RLS bloquent un élève connecté
  // (authenticated ≠ prof) → sans ça, "Studio introuvable" pour les élèves.
  // On ne sélectionne QUE des champs publics (jamais de secrets Stripe).
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('studio_nom, metier, ville')
    .eq('studio_slug', studioSlug)
    .single();

  if (!profile) return { title: t('Studio introuvable') };
  return {
    title: t('{studio} · Réserver un cours', { studio: profile.studio_nom }),
    // Canonique posée ici et PAS sur le layout /p/* (2026-08-28) : sur le
    // layout, elle serait héritée par /espace, /essai, /connexion et les pages
    // de cours, qui se déclareraient toutes comme des copies de l'accueil.
    // urlPortail est la source unique de l'adresse d'un portail : le jour où
    // les sous-domaines sont branchés, la canonique suit sans qu'on y repense.
    alternates: { canonical: urlPortail(studioSlug) },
    ...ogPortail({
      studio: profile,
      titre: t('{studio} · Réserver un cours', { studio: profile.studio_nom }),
      description: t('{metier} à {ville}. Réserve tes cours en ligne.', { metier: profile.metier || 'Studio', ville: profile.ville || 'France' }),
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
  // La page ne charge que 60 jours (lib/portail-fenetre) : au-delà, la vue
  // semaine et la liste vont chercher la suite par /api/portail/[slug]/seances
  // jusqu'à un an devant (2026-09-23, retour Manon : ses élèves lisaient
  // « Aucun cours cette semaine » sur une semaine de novembre bien remplie).
  const fenetreFin = finFenetre(today);

  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      id, studio_nom, studio_slug, metier, adresse, code_postal, ville, types_cours,
      prenom, nom,
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

  // Paginée (lib/portail-seances-service) : plus aucune limite ne coupe une
  // fenêtre en silence (la limite 240 d'avant, née en B1b, aurait coupé un
  // studio à 5 séances par jour).
  const [coursRaw, { data: offresStripe }, { data: offresPubliques }, { data: sondageActif }] = await Promise.all([
    lireSeancesBrutes(supabase, profile.id, today, fenetreFin).catch(() => []),
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
  // v122 / v123 : si l'élève est connue ici, sa langue (son cookie, sinon
  // celle de son navigateur quand le studio est en « auto ») est mémorisée
  // sur sa fiche pour ses emails et ses push (UPDATE séparé, muet sans colonne).
  if (clientInfo?.client_id) await memoriserLangueVisite(supabase, clientInfo.client_id, studioSlug);

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

  // v99 — le ton et la vignette de chaque TYPE de cours (config du studio),
  // v111 — l'équipe de la structure pour l'onglet « L'équipe ». Lectures
  // séparées et défensives : pré-migration, cartes vides, rien ne change.
  const [apparence, membresBruts] = await Promise.all([
    chargerVignettesConfig(supabase, profile.id),
    chargerIntervenantes(supabase, profile.id),
  ]);
  // Les séances telles que CETTE visiteuse les voit (visibilité, déjà
  // commencées écartées, places v89, prénom v111, photo v99) : même chaîne que
  // la route qui sert les semaines au-delà de la fenêtre.
  const coursAffiches = await chargerSeancesPortail(supabase, profile, {
    clientInfo, brutes: coursRaw, membres: membresBruts, route: `/p/${studioSlug}`,
  });
  const equipe = equipePourPortail(profile, membresBruts);
  // Pont 5 (v115) : « Sa page » sur la carte d'une intervenante qui a relié,
  // et « Je donne aussi des cours à … » quand CE portail est celui d'une prof
  // membre ailleurs. Lectures séparées et défensives : sans v115, rien.
  const liensEquipe = {};
  let ailleurs = [];
  try {
    const reliees = membresBruts.filter(m => m.portail_croise === true && m.auth_user_id);
    if (reliees.length > 0) {
      const { data: persos } = await supabase.from('profiles').select('id, studio_nom, studio_slug, portail_actif').in('id', reliees.map(m => m.auth_user_id));
      for (const m of reliees) {
        const p = pageDeLIntervenante(m, (persos || []).find(x => x.id === m.auth_user_id));
        if (p) liensEquipe[m.id] = p;
      }
    }
    const { data: mesApp, error: eApp } = await supabase.from('studio_membres').select('profile_id, statut, portail_croise').eq('auth_user_id', profile.id).eq('portail_croise', true);
    if (!eApp && (mesApp || []).length > 0) {
      const { data: structures } = await supabase.from('profiles').select('id, studio_nom, studio_slug, portail_actif, type_structure').in('id', mesApp.map(a => a.profile_id));
      ailleurs = structuresCitees(mesApp, structures || [], profile.id);
    }
  } catch { /* pré-v115 */ }
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

  // Frontière des plans (2026-09-07) : ce que la page publique d'un studio
  // Essentiel ne propose PAS — acheter en ligne, demander une offre, voter à
  // un sondage, lire la bio/FAQ (portail enrichi). Décidé côté SERVEUR : ce
  // qui ne doit pas s'afficher ne part pas au navigateur.
  const canAcheter = studioCan(profile, 'paiement_en_ligne');
  const canDemander = studioCan(profile, 'demande_offre');
  const enrichi = studioCan(profile, 'portail_enrichi');
  const sansLien = (o) => ({ ...o, stripe_payment_link: null });

  return {
    // Le compteur de vues (v119) ne compte JAMAIS la prof qui regarde son
    // propre portail : sans ça, trois allers-retours dans ses réglages
    // deviendraient « trois visiteuses » et la carte mentirait.
    estProprietaire: user?.id === profile.id,
    profile: enrichi ? profile : { ...profile, bio: null, philosophie: null, formations: null, annees_experience: null, faq_publique: [] },
    canDemander,
    cours: coursAffiches,
    // La dernière date chargée : au-delà, PortailHome demande la suite à la route.
    fenetreFin,
    equipe,
    liensEquipe,
    ailleurs,
    tonsParType: apparence.tons,
    vignettesParType: apparence.vignettes,
    offresStripe: canAcheter ? masquerLiensSiNonBranche(offresStripe, confStripe).filter(o => o.stripe_payment_link) : [],
    offresPubliques: masquerLiensSiNonBranche(offresPubliques, confStripe).map(o => (canAcheter ? o : sansLien(o))),
    sondageActif: studioCan(profile, 'sondages') ? (sondageActif || null) : null,
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

  // Compteur de vues (v119) : hors rendu, hors chemin critique, et muet quand
  // la table n'existe pas encore. Il sert à dire à une prof Essentiel « ta page
  // a été ouverte N fois cette semaine, et personne n'a pu réserver ».
  const ua = (await headers()).get('user-agent');
  after(() => compterVue(supabaseAdmin, { profileId: data.profile.id, userAgent: ua, estLaProf: data.estProprietaire }));

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
      fenetreFin={data.fenetreFin}
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
      equipe={data.equipe}
      liensEquipe={data.liensEquipe || {}}
      ailleurs={data.ailleurs || []}
      tabInitial={typeof sp?.tab === 'string' ? sp.tab : null}
      canReserve={studioCan(profile, 'reservation_en_ligne')}
      essaiVisible={studioCan(profile, 'cours_essai')}
      canDemander={data.canDemander !== false}
    />
  );
}
