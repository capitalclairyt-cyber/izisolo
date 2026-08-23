import { createServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';
import { countUnread } from '@/lib/messagerie';
import EspaceClient from './EspaceClient';
import { resoudreFicheEleve } from '@/lib/fiche-eleve';
import { getDocsInscription } from '@/lib/docs-inscription';
import { getVisioCoursMap, lienVisioVisible } from '@/lib/visio';
import { resoudreCarnetApplicable } from '@/lib/carnet-resolution';
import { urlPaiementSeance } from '@/lib/paiement-seance';
import { lireReglementConfig, referenceVirement } from '@/lib/reglement';
import { studioCan } from '@/lib/plan-guard';

// Le template racine ajoute déjà « — IziSolo » ; l'OG studio vient du layout portail.
export const metadata = { title: 'Mon espace', robots: { index: false, follow: false } };

// ─── Mode démo : données fake pour que le prof voie son portail comme une
// élève fictive. Active uniquement si ?demo=1 ET viewer = prof du studio. ──
function buildDemoData(profile) {
  const today = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const demoClient = {
    id: 'demo-client',
    prenom: 'Camille',
    nom: '(démo)',
    email: 'demo@izisolo.fr',
    telephone: '06 12 34 56 78',
    adresse_postale: '12 rue des Lilas',
    ville: 'Gillonnay',
  };

  const demoAVenir = [
    {
      id: 'demo-pres-1',
      statut_pointage: 'inscrit',
      created_at: new Date().toISOString(),
      cours: {
        id: 'demo-cours-1',
        nom: 'Pilates matinal',
        date: fmt(addDays(2)),
        heure: '09:30',
        duree_minutes: 60,
        lieu: profile.studio_nom || 'Studio',
        type_cours: 'Pilates',
        est_annule: false,
      },
    },
    {
      id: 'demo-pres-2',
      statut_pointage: 'inscrit',
      created_at: new Date().toISOString(),
      cours: {
        id: 'demo-cours-2',
        nom: 'Pilates barre',
        date: fmt(addDays(5)),
        heure: '18:00',
        duree_minutes: 75,
        lieu: profile.studio_nom || 'Studio',
        type_cours: 'Pilates',
        est_annule: false,
      },
    },
  ];

  const demoPasses = [
    {
      id: 'demo-pres-p1',
      statut_pointage: 'present',
      pointee: true,
      created_at: new Date().toISOString(),
      cours: {
        id: 'demo-cours-p1',
        nom: 'Pilates matinal',
        date: fmt(addDays(-3)),
        heure: '09:30',
        duree_minutes: 60,
        lieu: profile.studio_nom || 'Studio',
        type_cours: 'Pilates',
        est_annule: false,
      },
    },
  ];

  const demoAbonnements = [
    {
      id: 'demo-abo-1',
      offre_nom: 'Carnet 10 séances',
      type: 'carnet',
      date_debut: fmt(addDays(-30)),
      date_fin: fmt(addDays(150)),
      seances_total: 10,
      seances_utilisees: 4,
      statut: 'actif',
      date_pause_debut: null,
      date_pause_fin: null,
    },
  ];

  const demoPaiements = [
    {
      id: 'demo-pay-1',
      intitule: 'Carnet 10 séances',
      montant: 180,
      mode: 'cb',
      date: fmt(addDays(-30)),
      date_encaissement: fmt(addDays(-30)),
      statut: 'paid',
    },
  ];

  // Fidèle au réel : un cas « séance sans carnet » n'a PAS de montant (le vrai
  // code n'en écrit jamais) ; le montant chiffré vient des séances d'atelier
  // (tarif_unitaire) dérivées des présences.
  const demoARegler = [
    {
      id: 'demo-cas-1',
      case_type: 'eleve_sans_carnet',
      context: { choix_applique: 'paiement_sur_place', cours_nom: 'Pilates barre' },
      cours: { nom: 'Pilates barre', date: fmt(addDays(5)), heure: '18:00' },
    },
  ];

  const demoSeancesWorkshopDues = [
    {
      id: 'demo-ws-1',
      cours_nom: 'Atelier Yoga & Sonothérapie',
      cours_date: fmt(addDays(9)),
      montant: 25,
      annulationTardive: false,
    },
  ];

  return {
    profile,
    client: demoClient,
    aVenir: demoAVenir,
    passes: demoPasses,
    paiements: demoPaiements,
    offresStripe: [],
    abonnements: demoAbonnements,
    aRegler: demoARegler,
    seancesWorkshopDues: demoSeancesWorkshopDues,
  };
}

async function getData(studioSlug, user) {
  // On utilise le client admin (service_role, hors RLS) : le studio est une
  // info publique, et toutes les requêtes élève sont filtrées par profile_id
  // (studio) + email/client_id (l'élève authentifié·e), donc l'isolation est
  // garantie par les filtres. Sans ça, les RLS bloquent l'élève (qui n'est pas
  // le prof) → la lecture du profil studio renvoie null → notFound().
  const supabase = supabaseAdmin;

  // Studio (+ règles d'annulation pour application dans EspaceClient ;
  // + champs de plan pour studioCan — le lien de paiement par séance est une
  // capacité Complet, comme le Payment Link des offres)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, studio_nom, studio_slug, regles_annulation, plan, trial_started_at, stripe_subscription_status')
    .eq('studio_slug', studioSlug)
    .single();
  if (!profile) return null;

  // Client lié à ce studio (v83 : FK douce d'abord — l'espace survit à un
  // changement d'email de la fiche) + offres Stripe en parallèle
  const [client, { data: offresToutes }] = await Promise.all([
    resoudreFicheEleve(supabase, profile.id, user, 'id, prenom, nom, email, telephone, adresse_postale, ville'),
    supabase
      .from('offres')
      .select('id, nom, type, prix, seances, seances_par_semaine, duree_jours, stripe_payment_link')
      .eq('profile_id', profile.id)
      .eq('actif', true)
      .order('ordre'),
  ]);
  // Deux listes tirées de la même : celles qui s'achètent en ligne tout de
  // suite, et le catalogue complet dont on peut FAIRE LA DEMANDE (v97).
  const offresStripe = (offresToutes || []).filter(o => o.stripe_payment_link);
  const offresCatalogue = offresToutes || [];

  if (!client) {
    return { profile, client: null, aVenir: [], passes: [], paiements: [], offresStripe: offresStripe || [], abonnements: [], aRegler: [] };
  }

  // Mes paiements + abonnements actifs (pour afficher le solde)
  const [{ data: paiements }, { data: abonnements }] = await Promise.all([
    supabase
      .from('paiements')
      .select('id, intitule, montant, mode, date, date_encaissement, statut')
      .eq('profile_id', profile.id)
      .eq('client_id', client.id)
      .order('date', { ascending: false }),
    supabase
      .from('abonnements')
      .select('id, offre_nom, type, date_debut, date_fin, seances_total, seances_utilisees, statut, date_pause_debut, date_pause_fin, types_cours_autorises')
      .eq('profile_id', profile.id)
      .eq('client_id', client.id)
      .in('statut', ['actif', 'epuise', 'expire', 'gele'])
      .order('date_debut', { ascending: false }),
  ]);

  // Ses réservations avec détail des cours
  const { data: presences } = await supabase
    .from('presences')
    .select(`
      id,
      statut_pointage,
      type_presence,
      annulation_tardive,
      est_due,
      abonnement_id,
      created_at,
      cours:cours_id (
        id, nom, date, heure, duree_minutes, lieu, type_cours, est_annule, tarif_unitaire, carnets_acceptes, format, stripe_payment_link_unit
      )
    `)
    .eq('client_id', client.id)
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  // « Maintenant » en heure de Paris (le studio + les horaires des cours sont en
  // local FR). Corrige (1) le décalage UTC autour de minuit et (2) le cas d'un
  // cours de ce matin qui restait « à venir » le soir avec un bouton Annuler
  // trompeur — il bascule en historique une fois passé.
  const nowParis = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Paris' }); // "YYYY-MM-DD HH:mm:ss"
  const today = nowParis.slice(0, 10);
  const nowHM = nowParis.slice(11, 16);
  const all = presences || [];

  // Passé = date antérieure, OU aujourd'hui mais déjà commencé (heure ≤ maintenant).
  const estPasse = (c) => {
    if (c.date < today) return true;
    if (c.date > today) return false;
    return (c.heure || '23:59') <= nowHM;
  };

  // Les cours annulés FUTURS restent dans « à venir » (alerte pour l'élève).
  const aVenir = all
    .filter(p => p.cours && !estPasse(p.cours))
    .sort((a, b) => {
      if (a.cours.date !== b.cours.date) return a.cours.date.localeCompare(b.cours.date);
      return (a.cours.heure || '').localeCompare(b.cours.heure || '');
    });

  const passes = all
    .filter(p => p.cours && estPasse(p.cours))
    .sort((a, b) => b.cours.date.localeCompare(a.cours.date));

  // Paiements à prévoir : cas ouverts (resolu_at null) impliquant une somme due
  // par l'élève — dette créée ou paiement attendu sur place. Quand la prof
  // résout le cas (encaissé / offert), il disparaît automatiquement d'ici.
  const { data: casOuverts } = await supabase
    .from('cas_a_traiter')
    .select('id, case_type, context, created_at, presence_id, cours:cours_id(nom, date, heure)')
    .eq('profile_id', profile.id)
    .eq('client_id', client.id)
    .is('resolu_at', null)
    .order('created_at', { ascending: false });
  const aRegler = (casOuverts || []).filter(c => {
    const ch = c.context?.choix_applique;
    return ch === 'creer_dette' || ch === 'paiement_sur_place' || c.context?.dette_a_regler === true;
  });

  // Séances « payables à la séance » (cours à tarif_unitaire) non réglées —
  // dérivées des présences + paiements liés (v65), PAS des cas_a_traiter (le
  // cas workshop n'est souvent même pas loggé). C'est la seule source fiable :
  // l'élève voit « à régler · X € » dès la réservation, la ligne disparaît
  // quand la prof encaisse (paiement lié à la présence).
  const presWorkshop = all.filter(p =>
    Number(p.cours?.tarif_unitaire) > 0
    && (p.type_presence || 'normal') === 'normal'          // essai/offert = gratuit
    // annule/declinee = résa annulée côté studio : plus rien à régler
    // (miroir du fix Revenus — B1f).
    && !['absent', 'excuse', 'annule', 'declinee'].includes(p.statut_pointage)
    && !p.cours?.est_annule
    // Liée à un carnet = couverte (override atelier, ou mixte déjà pointé) —
    // le filtre l'ignorait : une présence décomptée s'affichait AUSSI « à
    // régler » (B2f).
    && !p.abonnement_id
    // Cours MIXTE (v82) pas encore pointé : si un carnet de l'élève couvre ce
    // type, le pointage le décomptera → pas une dette (même prévision que la
    // page cours). Si le carnet s'épuise d'ici là, le pointage retombera sur
    // le tarif et la ligne apparaîtra — la prévision converge au réel.
    && !(p.cours?.carnets_acceptes === true
         && resoudreCarnetApplicable(abonnements || [], p.cours))
  );
  let seancesWorkshopDues = [];
  if (presWorkshop.length > 0) {
    const { data: paiesLies } = await supabase
      .from('paiements')
      .select('presence_id, statut')
      .eq('client_id', client.id)
      .in('presence_id', presWorkshop.map(p => p.id));
    // Une présence « couverte » = un paiement lié existe déjà (payé, ou en
    // attente — déjà listé dans « À régler » via paiementsDus : pas de doublon).
    const couvertes = new Set((paiesLies || [])
      .filter(x => ['paid', 'pending', 'overdue'].includes(x.statut))
      .map(x => x.presence_id));
    // Paiement en ligne par séance (v2 de v86) : URL taguée de la présence —
    // le webhook rattachera le paiement. Capacité Complet, comme les offres.
    const paiementEnLigne = studioCan(profile, 'paiement_en_ligne');
    seancesWorkshopDues = presWorkshop
      .filter(p => !couvertes.has(p.id))
      .map(p => ({
        id: p.id,
        cours_nom: p.cours.nom,
        cours_date: p.cours.date,
        montant: Number(p.cours.tarif_unitaire),
        annulationTardive: !!p.annulation_tardive,
        paiement_url: paiementEnLigne
          ? urlPaiementSeance(p.cours.stripe_payment_link_unit, p.id, client.email)
          : '',
      }));
  }

  // Annulations tardives « séance due » sur cours NORMAL (pas de carnet
  // décompté, montant à la discrétion du studio) — miroir de l'email « la
  // séance reste due ». Dédupliquées des cas dette ouverts (decompter_ou_dette)
  // déjà listés dans aRegler.
  const casPresenceIds = new Set((casOuverts || []).map(c => c.presence_id).filter(Boolean));
  const annulationsDues = all
    .filter(p =>
      p.est_due === true
      && !p.abonnement_id
      && !(Number(p.cours?.tarif_unitaire) > 0)   // les tarifées sont déjà dans seancesWorkshopDues
      && !casPresenceIds.has(p.id)
    )
    .map(p => ({
      id: p.id,
      cours_nom: p.cours?.nom || 'Séance',
      cours_date: p.cours?.date || null,
    }));

  // Facturation (v84) — requêtes SÉPARÉES et défensives : colonnes/table
  // absentes (migration pas appliquée) → reçu simple, l'espace vit. Ne JAMAIS
  // ajouter facturation_* au select principal (anti-pattern colonnes fantômes).
  let facturationActive = false;
  {
    const { data: fact, error: factErr } = await supabase
      .from('profiles')
      .select('facturation_siret')
      .eq('id', profile.id)
      .maybeSingle();
    if (!factErr && String(fact?.facturation_siret || '').trim()) facturationActive = true;
  }
  // Règlement par virement (v98) — même règle : requête SÉPARÉE et défensive,
  // la colonne ne va JAMAIS dans un select principal. Sans migration ou sans
  // RIB : le bouton « Comment régler ? » ne propose que espèces/chèque.
  let ribStudio = null;
  let refVirement = null;
  {
    try {
      const { data: reg, error: regErr } = await supabase
        .from('profiles')
        .select('reglement_config')
        .eq('id', profile.id)
        .maybeSingle();
      if (!regErr) {
        const cfgReglement = lireReglementConfig(reg);
        ribStudio = cfgReglement?.rib || null;
      }
    } catch { /* pré-v98 */ }
    refVirement = referenceVirement(client?.id);
  }

  let facturesParPaiement = {};
  if (facturationActive && (paiements || []).length > 0) {
    const { data: liaisons, error: liErr } = await supabase
      .from('factures_paiements')
      .select('paiement_id, facture:facture_id (numero_affiche, statut)')
      .in('paiement_id', paiements.map(p => p.id));
    if (!liErr) {
      for (const l of liaisons || []) {
        if (l.facture?.statut === 'emise') facturesParPaiement[l.paiement_id] = l.facture.numero_affiche;
      }
    }
  }

  // Compteur de messages non lus (pour la cloche de notifications de l'espace).
  let unreadMessages = 0;
  try { unreadMessages = await countUnread(supabase, 'eleve', client.id); } catch { /* badge décoratif : l'espace s'affiche sans le compteur */ }

  // Préférences de notif — requête SÉPARÉE et défensive : si la colonne
  // notif_prefs n'existe pas encore (migration v60 pas appliquée), on retombe
  // sur {} sans casser tout le chargement de l'espace.
  let clientPrefs = {};
  const { data: cp, error: cpErr } = await supabase
    .from('clients').select('notif_prefs').eq('id', client.id).maybeSingle();
  if (!cpErr && cp?.notif_prefs) clientPrefs = cp.notif_prefs;

  // Documents d'inscription (v85) — requête séparée défensive (colonne absente → [])
  const docsInscription = await getDocsInscription(supabase, profile.id);

  // Cours en ligne (v86) — le verrou du lien se calcule ICI, côté serveur :
  // l'URL ne part JAMAIS vers le client pour une séance non couverte/réglée.
  // visioParPresence : presenceId → url (uniquement si visible) ou
  // { verrouille: true } (le cours a un lien mais cette séance ne l'ouvre pas).
  const visioParPresence = {};
  {
    const presVisio = aVenir.filter(p => p.cours?.format === 'visio' || p.cours?.format === 'hybride');
    if (presVisio.length) {
      const visioMap = await getVisioCoursMap(supabase, presVisio.map(p => p.cours.id));
      const presIds = presVisio.map(p => p.id);
      // Paiements 'paid' rattachés à ces présences (v65) — requête ciblée
      let paidSet = new Set();
      if (presIds.length) {
        const { data: paids } = await supabase
          .from('paiements')
          .select('presence_id, statut')
          .in('presence_id', presIds)
          .eq('statut', 'paid');
        paidSet = new Set((paids || []).map(x => x.presence_id));
      }
      for (const p of presVisio) {
        const visio = visioMap[p.cours.id];
        if (!visio) continue; // pas de lien configuré (ou v86 pas appliquée)
        const visible = lienVisioVisible(visio, p, paidSet.has(p.id) ? [{ statut: 'paid' }] : []);
        visioParPresence[p.id] = visible ? { url: visio.lien_visio } : { verrouille: true };
      }
    }
  }

  return { profile, client, aVenir, passes, paiements: paiements || [], offresStripe: offresStripe || [], offresCatalogue, abonnements: abonnements || [], aRegler, seancesWorkshopDues, annulationsDues, unreadMessages, clientPrefs, facturationActive, facturesParPaiement, docsInscription, visioParPresence, ribStudio, refVirement };
}

export default async function EspacePage({ params, searchParams }) {
  const { studioSlug } = await params;
  const sp = (await searchParams) || {};
  const isDemoRequest = sp.demo === '1';

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/p/${studioSlug}/connexion`);
  }

  // Récupérer le profil du studio pour détecter si l'user est le prof.
  // Via le client admin : le studio est public, et un élève (≠ prof) ne peut
  // pas le lire avec son propre client à cause des RLS → null → notFound().
  const { data: ownerProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, studio_nom, studio_slug, regles_annulation')
    .eq('studio_slug', studioSlug)
    .single();

  if (!ownerProfile) notFound();

  // Si l'user est le prof du studio : on bascule automatiquement en mode démo
  // (le prof n'est pas client de son propre studio, donc sans ce bypass il
  // tomberait sur la page 'tu n'as pas de réservation').
  const isOwner = ownerProfile.id === user.id;
  if (isOwner || isDemoRequest) {
    if (isOwner) {
      const demoData = buildDemoData(ownerProfile);
      return (
        <EspaceClient
          profile={demoData.profile}
          client={demoData.client}
          aVenir={demoData.aVenir}
          passes={demoData.passes}
          paiements={demoData.paiements}
          offresStripe={demoData.offresStripe}
          abonnements={demoData.abonnements}
          aRegler={demoData.aRegler}
          seancesWorkshopDues={demoData.seancesWorkshopDues || []}
          studioSlug={studioSlug}
          userEmail={user.email}
          isDemo={true}
        />
      );
    }
    // demo=1 mais user n'est PAS le prof → on ignore le flag, vraie data
  }

  const data = await getData(studioSlug, user);
  if (!data) notFound();

  return (
    <EspaceClient
      profile={data.profile}
      client={data.client}
      aVenir={data.aVenir || []}
      passes={data.passes || []}
      paiements={data.paiements || []}
      offresStripe={data.offresStripe || []}
      offresCatalogue={data.offresCatalogue || []}
      abonnements={data.abonnements || []}
      aRegler={data.aRegler || []}
      seancesWorkshopDues={data.seancesWorkshopDues || []}
      annulationsDues={data.annulationsDues || []}
      unreadMessages={data.unreadMessages || 0}
      clientPrefs={data.clientPrefs || {}}
      facturationActive={data.facturationActive || false}
      facturesParPaiement={data.facturesParPaiement || {}}
      docsInscription={data.docsInscription || []}
      ribStudio={data.ribStudio || null}
      refVirement={data.refVirement || null}
      visioParPresence={data.visioParPresence || {}}
      studioSlug={studioSlug}
      userEmail={user.email}
    />
  );
}
